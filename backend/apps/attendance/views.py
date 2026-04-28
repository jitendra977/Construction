import base64
import calendar
import io
import json
import logging
from datetime import date as date_type, datetime
from decimal import Decimal

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import AttendanceWorker, DailyAttendance, QRScanLog, ScanTimeWindow, ProjectHoliday
from .serializers import (
    AttendanceWorkerSerializer,
    DailyAttendanceSerializer,
    BulkAttendanceSerializer,
    QRScanLogSerializer,
    ScanTimeWindowSerializer,
)

logger = logging.getLogger(__name__)

ROLE_TO_TRADE = {
    "OWNER": "MANAGER", "MANAGER": "MANAGER", "ENGINEER": "ENGINEER",
    "SUPERVISOR": "SUPERVISOR", "CONTRACTOR": "OTHER", "VIEWER": "OTHER",
}


def _get_client_ip(request):
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def _make_qr_payload(worker):
    return json.dumps({
        "type": "hcms_attendance",
        "worker_id": worker.id,
        "project_id": worker.project_id,
        "token": str(worker.qr_token),
    }, separators=(",", ":"))


def _generate_qr_png_b64(data_str):
    import qrcode
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data_str)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1a1a2e", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{b64}"


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_time_window(project):
    """Return active ScanTimeWindow for a project, or None."""
    try:
        w = ScanTimeWindow.objects.get(project=project)
        return w if w.is_active else None
    except ScanTimeWindow.DoesNotExist:
        return None


def _get_effective_window(worker):
    """
    Return the time window to enforce for this specific worker.
    Priority:
      1. Worker's own custom window (if use_custom_window=True and all 4 times set)
      2. Project-level ScanTimeWindow (if active)
      3. None  →  no restriction
    """
    if (worker.use_custom_window
            and worker.custom_checkin_start
            and worker.custom_checkin_end
            and worker.custom_checkout_start
            and worker.custom_checkout_end):
        from types import SimpleNamespace
        return SimpleNamespace(
            is_active=True,
            checkin_start=worker.custom_checkin_start,
            checkin_end=worker.custom_checkin_end,
            checkout_start=worker.custom_checkout_start,
            checkout_end=worker.custom_checkout_end,
            late_threshold_minutes=30,
            early_checkout_minutes=30,
            _source="worker",
        )
    return _get_time_window(worker.project)


def _fix_missed_checkouts(worker, today):
    """
    Auto-close any open check-ins from PREVIOUS days.
    Called before processing today's scan so the worker's state is clean.
    Returns list of records that were auto-closed.
    """
    from datetime import time as time_type
    missed = DailyAttendance.objects.filter(
        worker=worker,
        check_in__isnull=False,
        check_out__isnull=True,
    ).exclude(date=today)

    closed = []
    for rec in missed:
        # Close at project checkout window start, or default 17:00
        try:
            win = ScanTimeWindow.objects.get(project=worker.project)
            close_time = win.checkout_start
        except ScanTimeWindow.DoesNotExist:
            close_time = time_type(17, 0)
        rec.check_out = close_time
        suffix = "\n[Auto-closed: missed checkout — reset next day]"
        rec.notes = (rec.notes + suffix) if rec.notes else suffix.strip()
        rec.save(update_fields=["check_out", "notes"])
        closed.append(rec)
    return closed


def _auto_calc_overtime(record, today, time_out):
    """Recalculate and save overtime_hours based on actual worked hours > 8."""
    if record.check_in:
        dt_in  = datetime.combine(today, record.check_in)
        dt_out = datetime.combine(today, time_out)
        worked = (dt_out - dt_in).total_seconds() / 3600
        if worked > 8:
            record.overtime_hours = Decimal(str(round(worked - 8, 2)))
            record.save(update_fields=["overtime_hours"])


# ── QR Scan (AllowAny - kiosk/tablet use) ─────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def qr_scan(request):
    """
    POST /api/v1/attendance/qr-scan/
    Body: { "qr_data": "<JSON string from QR code>" }

    Smart scan flow:
      1. Validate QR code
      2. Cooldown guard (60 s)
      3. Auto-close missed checkouts from previous days
      4. Enforce time window (if project has active ScanTimeWindow)
      5. Determine action: CHECK_IN or CHECK_OUT based on today's record state
      6. Create/update DailyAttendance
      7. Log to QRScanLog
    """
    from datetime import timedelta

    raw = request.data.get("qr_data", "")
    if not raw:
        return Response({"error": "qr_data is required."}, status=400)

    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        QRScanLog.objects.create(
            worker_id=None, scan_type="INVALID", scan_status="REJECTED",
            scanned_at=timezone.now(),
            ip_address=_get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            note="Malformed JSON in QR data",
        ) if False else None  # worker_id required; skip log for truly invalid
        return Response({"error": "Invalid QR code format."}, status=400)

    if payload.get("type") != "hcms_attendance":
        return Response({"error": "Not an HCMS attendance QR code."}, status=400)

    try:
        worker = AttendanceWorker.objects.select_related("project").get(
            pk=payload.get("worker_id"),
            qr_token=payload.get("token"),
            is_active=True,
        )
    except (AttendanceWorker.DoesNotExist, Exception):
        return Response({"error": "Invalid or revoked QR code."}, status=404)

    now        = timezone.localtime()
    today      = now.date()
    time_now   = now.time()
    scanned_by = request.user if request.user.is_authenticated else None

    def _log(scan_type, scan_status="VALID", attendance=None,
             is_late=False, is_early=False, note=""):
        return QRScanLog.objects.create(
            worker=worker, attendance=attendance,
            scan_type=scan_type, scan_status=scan_status,
            is_late=is_late, is_early=is_early,
            scanned_at=now, scanned_by=scanned_by,
            ip_address=_get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            note=note,
        )

    # ── 1. Cooldown guard ──────────────────────────────────────────────────────
    COOLDOWN_SECONDS = 60
    cutoff = now - timedelta(seconds=COOLDOWN_SECONDS)
    last_scan = QRScanLog.objects.filter(
        worker=worker,
        scanned_at__gte=cutoff,
        scan_status="VALID",
    ).order_by("-scanned_at").first()

    if last_scan:
        seconds_ago = int((now - last_scan.scanned_at).total_seconds())
        wait = COOLDOWN_SECONDS - seconds_ago
        _log("IGNORED", "DUPLICATE",
             note=f"Duplicate scan — {seconds_ago}s after last valid scan")
        return Response({
            "success": False, "action": "IGNORED",
            "message": f"Already scanned {seconds_ago}s ago. Please wait {wait}s.",
            "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
            "project": {"id": worker.project_id, "name": worker.project.name},
            "cooldown_remaining": wait,
        }, status=200)

    # ── 2. Fix missed checkouts from previous days ─────────────────────────────
    _fix_missed_checkouts(worker, today)

    # ── 3. Get today's record (if any) ────────────────────────────────────────
    try:
        today_record = DailyAttendance.objects.get(worker=worker, date=today)
    except DailyAttendance.DoesNotExist:
        today_record = None

    # ── 4. Determine intended action ──────────────────────────────────────────
    if today_record is None:
        intended = "CHECK_IN"
    elif today_record.check_in and today_record.check_out is None:
        intended = "CHECK_OUT"
    else:
        # Both already set — this is a BLOCKED re-scan
        _log("BLOCKED", "REJECTED",
             attendance=today_record,
             note="Both check-in and check-out already recorded for today")
        return Response({
            "success": False, "action": "BLOCKED",
            "message": "Already checked in and out today.",
            "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
            "project": {"id": worker.project_id, "name": worker.project.name},
            "attendance": _attendance_dict(today_record),
        }, status=200)

    # ── 5. Enforce time window ─────────────────────────────────────────────────
    # Worker's custom window takes priority over the project-level window.
    window = _get_effective_window(worker)
    is_late  = False
    is_early = False

    if window:
        if intended == "CHECK_IN":
            in_window = window.checkin_start <= time_now <= window.checkin_end
            if not in_window:
                _log("OUT_OF_TIME", "REJECTED",
                     note=(f"Check-in attempt at {time_now.strftime('%H:%M')} "
                           f"outside window {window.checkin_start:%H:%M}–{window.checkin_end:%H:%M}"))
                return Response({
                    "success": False, "action": "OUT_OF_TIME",
                    "message": (
                        f"Check-in window is {window.checkin_start.strftime('%H:%M')}–"
                        f"{window.checkin_end.strftime('%H:%M')}. "
                        f"Current time {time_now.strftime('%H:%M')} is outside the window."
                    ),
                    "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
                    "project": {"id": worker.project_id, "name": worker.project.name},
                    "window": {
                        "checkin_start":  window.checkin_start.strftime("%H:%M"),
                        "checkin_end":    window.checkin_end.strftime("%H:%M"),
                        "checkout_start": window.checkout_start.strftime("%H:%M"),
                        "checkout_end":   window.checkout_end.strftime("%H:%M"),
                    },
                }, status=200)
            # Late detection
            from datetime import timedelta as td
            late_threshold = (
                datetime.combine(today, window.checkin_start) + td(minutes=window.late_threshold_minutes)
            ).time()
            is_late = time_now > late_threshold

        elif intended == "CHECK_OUT":
            in_window = window.checkout_start <= time_now <= window.checkout_end
            if not in_window:
                _log("OUT_OF_TIME", "REJECTED",
                     attendance=today_record,
                     note=(f"Check-out attempt at {time_now.strftime('%H:%M')} "
                           f"outside window {window.checkout_start:%H:%M}–{window.checkout_end:%H:%M}"))
                return Response({
                    "success": False, "action": "OUT_OF_TIME",
                    "message": (
                        f"Check-out window is {window.checkout_start.strftime('%H:%M')}–"
                        f"{window.checkout_end.strftime('%H:%M')}. "
                        f"Current time {time_now.strftime('%H:%M')} is outside the window."
                    ),
                    "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
                    "project": {"id": worker.project_id, "name": worker.project.name},
                    "window": {
                        "checkin_start":  window.checkin_start.strftime("%H:%M"),
                        "checkin_end":    window.checkin_end.strftime("%H:%M"),
                        "checkout_start": window.checkout_start.strftime("%H:%M"),
                        "checkout_end":   window.checkout_end.strftime("%H:%M"),
                    },
                    "attendance": _attendance_dict(today_record),
                }, status=200)
            # Early checkout detection
            from datetime import timedelta as td
            early_threshold = (
                datetime.combine(today, window.checkout_start) - td(minutes=window.early_checkout_minutes)
            ).time()
            is_early = time_now < early_threshold

    # ── 6. Execute the action ──────────────────────────────────────────────────
    if intended == "CHECK_IN":
        record = DailyAttendance.objects.create(
            worker=worker,
            project=worker.project,
            date=today,
            status="PRESENT",
            check_in=time_now,
            recorded_by=scanned_by,
        )
        late_note = " (LATE)" if is_late else ""
        action_msg = f"Checked in at {time_now.strftime('%I:%M %p')}{late_note}"
        _log("CHECK_IN", "VALID", attendance=record,
             is_late=is_late, note=f"Check-in at {time_now.strftime('%H:%M')}{late_note}")

    else:  # CHECK_OUT
        today_record.check_out = time_now
        today_record.save(update_fields=["check_out"])
        _auto_calc_overtime(today_record, today, time_now)
        record = today_record
        early_note = " (EARLY)" if is_early else ""
        action_msg = f"Checked out at {time_now.strftime('%I:%M %p')}{early_note}"
        _log("CHECK_OUT", "VALID", attendance=record,
             is_early=is_early, note=f"Check-out at {time_now.strftime('%H:%M')}{early_note}")

    return Response({
        "success": True,
        "action":  intended,
        "message": action_msg,
        "is_late":  is_late,
        "is_early": is_early,
        "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
        "project": {"id": worker.project_id, "name": worker.project.name},
        "attendance": _attendance_dict(record),
        **({"window_status": "active", "late_checkin": is_late, "early_checkout": is_early}
           if window else {"window_status": "disabled"}),
    })


def _attendance_dict(record):
    return {
        "id":             record.id,
        "date":           str(record.date),
        "status":         record.status,
        "check_in":       record.check_in.strftime("%H:%M")  if record.check_in  else None,
        "check_out":      record.check_out.strftime("%H:%M") if record.check_out else None,
        "overtime_hours": float(record.overtime_hours),
        "wage_earned":    float(record.wage_earned),
    }


# ── Scan Time Window API ───────────────────────────────────────────────────────

@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def time_window(request):
    """
    GET  /api/v1/attendance/time-window/?project=<id>
    PUT  /api/v1/attendance/time-window/?project=<id>
    Retrieve or update the ScanTimeWindow for a project.
    Creates with defaults if none exists yet.
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    win, _ = ScanTimeWindow.objects.get_or_create(
        project_id=project_id,
        defaults={"created_by": request.user},
    )

    if request.method == "GET":
        return Response(ScanTimeWindowSerializer(win).data)

    ser = ScanTimeWindowSerializer(win, data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response(ser.data)


# ── Missed Checkouts API ───────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def missed_checkouts(request):
    """
    GET /api/v1/attendance/missed-checkouts/?project=<id>
    Returns workers who have an open check-in (no check-out) from a previous day.
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    today = date_type.today()
    open_records = DailyAttendance.objects.filter(
        project_id=project_id,
        check_in__isnull=False,
        check_out__isnull=True,
    ).exclude(date=today).select_related("worker").order_by("-date")

    data = []
    for rec in open_records:
        data.append({
            "attendance_id": rec.id,
            "worker_id":     rec.worker_id,
            "worker_name":   rec.worker.name,
            "trade":         rec.worker.get_trade_display(),
            "date":          str(rec.date),
            "check_in":      rec.check_in.strftime("%H:%M") if rec.check_in else None,
            "check_out":     None,
            "notes":         rec.notes,
        })

    return Response({"count": len(data), "missed": data})


# ── Manual Checkout API ────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def manual_checkout(request):
    """
    POST /api/v1/attendance/manual-checkout/
    Body: { "attendance_id": <int>, "check_out": "HH:MM", "note": "" }
    Manually closes a missed checkout record.
    """
    attendance_id = request.data.get("attendance_id")
    checkout_str  = request.data.get("check_out", "")
    note          = request.data.get("note", "")

    if not attendance_id:
        return Response({"error": "attendance_id is required."}, status=400)

    try:
        record = DailyAttendance.objects.select_related("worker").get(pk=attendance_id)
    except DailyAttendance.DoesNotExist:
        return Response({"error": "Attendance record not found."}, status=404)

    if record.check_out:
        return Response({"error": "This record already has a check-out."}, status=400)

    from datetime import time as time_type
    if checkout_str:
        try:
            h, m = map(int, checkout_str.split(":"))
            checkout_time = time_type(h, m)
        except (ValueError, AttributeError):
            return Response({"error": "check_out must be HH:MM format."}, status=400)
    else:
        checkout_time = time_type(17, 0)

    record.check_out = checkout_time
    admin_note = f"[Manual checkout by {request.user.username}: {checkout_str or '17:00'}]"
    if note:
        admin_note += f" {note}"
    record.notes = (record.notes + "\n" + admin_note) if record.notes else admin_note
    record.save(update_fields=["check_out", "notes"])
    _auto_calc_overtime(record, record.date, checkout_time)

    return Response({
        "success": True,
        "message": f"Manual checkout set to {checkout_time.strftime('%H:%M')} for {record.worker.name} on {record.date}.",
        "attendance": _attendance_dict(record),
    })


# ── Project Scan Logs API ──────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def project_scan_logs(request):
    """
    GET /api/v1/attendance/scan-logs/?project=<id>&date=<YYYY-MM-DD>&limit=100
    Returns QR scan log for a project (for the admin panel).
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    qs = QRScanLog.objects.filter(
        worker__project_id=project_id
    ).select_related("worker", "scanned_by", "attendance").order_by("-scanned_at")

    if d := request.query_params.get("date"):
        qs = qs.filter(scanned_at__date=d)

    if status_filter := request.query_params.get("scan_status"):
        qs = qs.filter(scan_status=status_filter)

    limit = min(int(request.query_params.get("limit", 100)), 500)
    qs = qs[:limit]

    return Response(QRScanLogSerializer(qs, many=True).data)


# ── Worker ViewSet ─────────────────────────────────────────────────────────────

class AttendanceWorkerViewSet(viewsets.ModelViewSet):
    serializer_class   = AttendanceWorkerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AttendanceWorker.objects.select_related(
            "project", "linked_user", "project_member", "project_member__user"
        )
        if p := self.request.query_params.get("project"):
            qs = qs.filter(project_id=p)
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(is_active=True)
        if wt := self.request.query_params.get("worker_type"):
            qs = qs.filter(worker_type=wt)
        return qs

    @action(detail=False, methods=["get"], url_path="my-qr")
    def my_qr(self, request):
        """
        GET /api/v1/attendance/workers/my-qr/?project=<id>
        Returns (or auto-creates) the QR badge for the currently logged-in user.
        If no AttendanceWorker exists for this user+project, one is created as STAFF/MANAGER.
        """
        project_id = request.query_params.get("project")
        if not project_id:
            return Response({"error": "project is required"}, status=400)

        u = request.user

        # Try to find existing worker linked to this user in this project
        worker = AttendanceWorker.objects.filter(
            project_id=project_id, linked_user=u
        ).first()

        if not worker:
            # Auto-create a STAFF worker for this user
            name = u.get_full_name().strip() or u.username
            # Avoid unique_together collision on (project, name)
            base_name = name
            suffix = 1
            while AttendanceWorker.objects.filter(project_id=project_id, name=name).exists():
                name = f"{base_name} ({suffix})"
                suffix += 1

            # Derive trade from project role if available
            try:
                from apps.core.models import ProjectMember
                member = ProjectMember.objects.filter(
                    project_id=project_id, user=u
                ).first()
                trade = ROLE_TO_TRADE.get(member.role if member else "", "MANAGER")
            except Exception:
                trade = "MANAGER"

            worker = AttendanceWorker.objects.create(
                project_id=project_id,
                name=name,
                trade=trade,
                worker_type="STAFF",
                linked_user=u,
                is_active=True,
                notes="Auto-created from My QR Badge",
            )
            logger.info("Auto-created AttendanceWorker %s for user %s", worker.id, u.username)

        payload_str = _make_qr_payload(worker)
        try:
            data_url = _generate_qr_png_b64(payload_str)
        except Exception as e:
            logger.error("QR gen failed for my-qr user %s: %s", u.username, e)
            return Response({"error": "QR generation failed."}, status=500)

        return Response({
            "worker_id":   worker.id,
            "worker_name": worker.name,
            "trade":       worker.get_trade_display(),
            "project":     worker.project.name,
            "qr_image":    data_url,
            "qr_payload":  payload_str,
            "qr_token":    str(worker.qr_token),
        })

    @action(detail=True, methods=["get"], url_path="qr-code")
    def qr_code(self, request, pk=None):
        worker = self.get_object()
        payload_str = _make_qr_payload(worker)
        try:
            data_url = _generate_qr_png_b64(payload_str)
        except Exception as e:
            logger.error("QR gen failed worker %s: %s", worker.id, e)
            return Response({"error": "QR generation failed."}, status=500)
        return Response({
            "worker_id":   worker.id,
            "worker_name": worker.name,
            "trade":       worker.get_trade_display(),
            "project":     worker.project.name,
            "qr_image":    data_url,
            "qr_payload":  payload_str,
            "qr_token":    str(worker.qr_token),
        })

    @action(detail=True, methods=["post"], url_path="regenerate-qr")
    def regenerate_qr(self, request, pk=None):
        import uuid as _uuid
        worker = self.get_object()
        worker.qr_token = _uuid.uuid4()
        worker.save(update_fields=["qr_token"])
        return Response({"message": f"QR regenerated for {worker.name}. Old badges are now invalid."})

    @action(detail=False, methods=["get"], url_path="team-unlinked")
    def team_unlinked(self, request):
        from apps.core.models import ProjectMember
        project_id = request.query_params.get("project")
        if not project_id:
            return Response({"error": "project is required"}, status=400)
        linked = AttendanceWorker.objects.filter(
            project_id=project_id, project_member__isnull=False
        ).values_list("project_member_id", flat=True)
        members = ProjectMember.objects.filter(
            project_id=project_id
        ).exclude(id__in=linked).select_related("user")
        data = []
        for m in members:
            u = m.user
            data.append({
                "member_id": m.id, "role": m.role, "note": m.note,
                "user_id": u.id, "name": u.get_full_name() or u.username,
                "email": u.email, "phone": getattr(u, "phone_number", "") or "",
                "suggested_trade": ROLE_TO_TRADE.get(m.role, "OTHER"),
            })
        return Response(data)

    @action(detail=False, methods=["post"], url_path="import-member")
    def import_member(self, request):
        from apps.core.models import ProjectMember
        project_id  = request.data.get("project")
        member_id   = request.data.get("member_id")
        daily_rate  = request.data.get("daily_rate", 0)
        worker_type = request.data.get("worker_type", "STAFF")
        if not project_id or not member_id:
            return Response({"error": "project and member_id are required"}, status=400)
        try:
            member = ProjectMember.objects.select_related("user").get(
                id=member_id, project_id=project_id
            )
        except ProjectMember.DoesNotExist:
            return Response({"error": "Project member not found."}, status=404)
        if AttendanceWorker.objects.filter(project_member=member).exists():
            return Response({"error": "Already an attendance worker."}, status=400)
        u = member.user
        worker = AttendanceWorker.objects.create(
            project_id=project_id,
            name=u.get_full_name() or u.username,
            trade=ROLE_TO_TRADE.get(member.role, "OTHER"),
            worker_type=worker_type,
            daily_rate=daily_rate,
            phone=getattr(u, "phone_number", "") or "",
            linked_user=u,
            project_member=member,
            notes=f"Imported from project team ({member.get_role_display()})",
        )
        return Response(
            AttendanceWorkerSerializer(worker, context={"request": request}).data, status=201
        )

    @action(detail=True, methods=["post"], url_path="create-account")
    def create_account(self, request, pk=None):
        """
        POST /api/v1/attendance/workers/{id}/create-account/
        Body (all optional):
          email    — defaults to <username>@<site>
          password — auto-generated if blank

        Creates a login account for this worker, links it, adds them to the
        project's assigned_projects, and creates a ProjectMember record.
        Returns the plain-text credentials (show once — admin must copy them).
        """
        import re, secrets
        from django.contrib.auth import get_user_model
        from apps.core.models import ProjectMember

        worker = self.get_object()

        if worker.linked_user_id:
            u = worker.linked_user
            return Response({
                "error": f"Worker already has an account — {u.email} (@{u.username})"
            }, status=400)

        # ── Build username from worker name ──────────────────────────────────
        User = get_user_model()
        base = re.sub(r"[^a-z0-9]", "", worker.name.lower().replace(" ", "."))
        if not base:
            base = f"worker{worker.id}"
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base}{counter}"
            counter += 1

        # ── Email & password ─────────────────────────────────────────────────
        email    = (request.data.get("email") or "").strip()
        password = (request.data.get("password") or "").strip()
        if not email:
            domain = request.get_host().split(":")[0]
            email = f"{username}@{domain}"
        if not password:
            password = secrets.token_urlsafe(10)   # 14 random chars

        # Ensure email is unique
        if User.objects.filter(email=email).exists():
            return Response({"error": f"Email already in use: {email}"}, status=400)

        # ── Create user ──────────────────────────────────────────────────────
        name_parts = worker.name.strip().split()
        first_name = name_parts[0] if name_parts else worker.name
        last_name  = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
                is_verified=True,
            )
        except Exception as exc:
            return Response({"error": f"Account creation failed: {exc}"}, status=400)

        # ── Link user → worker ───────────────────────────────────────────────
        worker.linked_user = user
        worker.save(update_fields=["linked_user"])

        # ── Grant access to this project ─────────────────────────────────────
        user.assigned_projects.add(worker.project)

        # ── Create ProjectMember (if not already) ────────────────────────────
        TRADE_TO_ROLE = {
            "MANAGER":     "MANAGER",
            "SUPERVISOR":  "SUPERVISOR",
            "ENGINEER":    "ENGINEER",
            "ACCOUNTANT":  "MANAGER",
        }
        role = TRADE_TO_ROLE.get(worker.trade, "CONTRACTOR" if worker.worker_type == "STAFF" else "VIEWER")

        member = None
        if not ProjectMember.objects.filter(project=worker.project, user=user).exists():
            member = ProjectMember(project=worker.project, user=user, role=role)
            member.apply_role_defaults()
            member.save()
            # Link back to attendance worker
            if not worker.project_member_id:
                worker.project_member = member
                worker.save(update_fields=["project_member"])

        logger.info(
            "Account created for worker %s (%s) — user %s", worker.id, worker.name, username
        )

        return Response({
            "success": True,
            "message": f"Account created for {worker.name}.",
            "credentials": {
                "name":     f"{first_name} {last_name}".strip(),
                "username": username,
                "email":    email,
                "password": password,
            },
            "project_role": role,
            "user_id": user.id,
        }, status=201)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        worker  = self.get_object()
        records = list(DailyAttendance.objects.filter(worker=worker).order_by("-date")[:100])
        return Response({
            "worker": worker.name,
            "stats": {
                "total_days": len(records),
                "total_wage": round(sum(float(r.wage_earned) for r in records), 2),
                "total_ot":   round(sum(float(r.overtime_hours) for r in records), 2),
            },
            "records": DailyAttendanceSerializer(records, many=True).data,
        })

    @action(detail=True, methods=["get"], url_path="scan-logs")
    def scan_logs(self, request, pk=None):
        worker = self.get_object()
        logs = QRScanLog.objects.filter(worker=worker).select_related("scanned_by")[:50]
        return Response(QRScanLogSerializer(logs, many=True).data)

    # ── Contractor link/unlink ─────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="link-contractor")
    def link_contractor(self, request, pk=None):
        """
        POST /api/v1/attendance/workers/{id}/link-contractor/
        Body: { "contractor_id": <int>, "sync_data": true/false }
        Links a resources.Contractor to this AttendanceWorker.
        Optionally syncs name/phone/daily_rate from contractor.
        """
        from apps.resources.models import Contractor

        worker        = self.get_object()
        contractor_id = request.data.get("contractor_id")
        sync_data     = request.data.get("sync_data", True)

        if not contractor_id:
            return Response({"error": "contractor_id is required."}, status=400)

        try:
            contractor = Contractor.objects.get(pk=contractor_id, project=worker.project)
        except Contractor.DoesNotExist:
            return Response({"error": "Contractor not found in this project."}, status=404)

        # Check if contractor is already linked to another worker
        if hasattr(contractor, "attendance_worker") and contractor.attendance_worker != worker:
            return Response({
                "error": f"Contractor '{contractor.name}' is already linked to attendance worker "
                         f"'{contractor.attendance_worker.name}' (id={contractor.attendance_worker_id})."
            }, status=400)

        worker.contractor = contractor
        update_fields = ["contractor"]

        if sync_data:
            # Sync contractor → worker (contractor is the source of truth for identity)
            if contractor.name:
                worker.name = contractor.name
                update_fields.append("name")
            if contractor.phone:
                worker.phone = contractor.phone
                update_fields.append("phone")
            if contractor.daily_wage and contractor.daily_wage > 0:
                worker.daily_rate = contractor.daily_wage
                update_fields.append("daily_rate")

        worker.save(update_fields=update_fields)

        logger.info(
            "Linked contractor %s (%s) → attendance worker %s (%s)",
            contractor.id, contractor.name, worker.id, worker.name,
        )

        return Response(
            AttendanceWorkerSerializer(worker, context={"request": request}).data,
            status=200,
        )

    @action(detail=True, methods=["post"], url_path="unlink-contractor")
    def unlink_contractor(self, request, pk=None):
        """
        POST /api/v1/attendance/workers/{id}/unlink-contractor/
        Removes the contractor link. No data is deleted.
        """
        worker = self.get_object()
        if not worker.contractor_id:
            return Response({"error": "This worker has no linked contractor."}, status=400)
        worker.contractor = None
        worker.save(update_fields=["contractor"])
        return Response(
            AttendanceWorkerSerializer(worker, context={"request": request}).data,
            status=200,
        )

    @action(detail=True, methods=["post"], url_path="sync-from-contractor")
    def sync_from_contractor(self, request, pk=None):
        """
        POST /api/v1/attendance/workers/{id}/sync-from-contractor/
        Re-syncs name, phone, daily_rate from the linked contractor.
        """
        worker = self.get_object()
        if not worker.contractor_id:
            return Response({"error": "No contractor linked. Link one first."}, status=400)

        c = worker.contractor
        changed = []
        if c.name and c.name != worker.name:
            worker.name = c.name
            changed.append("name")
        if c.phone and c.phone != worker.phone:
            worker.phone = c.phone
            changed.append("phone")
        if c.daily_wage and c.daily_wage > 0 and c.daily_wage != worker.daily_rate:
            worker.daily_rate = c.daily_wage
            changed.append("daily_rate")

        if changed:
            worker.save(update_fields=changed)
            return Response({
                "synced": True,
                "fields_updated": changed,
                "worker": AttendanceWorkerSerializer(worker, context={"request": request}).data,
            })
        return Response({"synced": False, "message": "Already in sync. No changes needed."})


# ── Unlinked Contractors API ───────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def unlinked_contractors(request):
    """
    GET /api/v1/attendance/unlinked-contractors/?project=<id>
    Returns contractors in this project that have NO linked attendance worker yet.
    Useful for the "Link to Resource" picker in ManpowerTab.
    """
    from apps.resources.models import Contractor

    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    # Contractors in this project with no attendance_worker reverse relation
    contractors = Contractor.objects.filter(
        project_id=project_id,
        attendance_worker__isnull=True,
        is_active=True,
    ).order_by("name")

    data = [
        {
            "id":         c.id,
            "name":       c.display_name,
            "role":       c.role,
            "role_label": c.get_role_display(),
            "phone":      c.display_phone,
            "email":      c.display_email,
            "daily_wage": float(c.daily_wage) if c.daily_wage else None,
        }
        for c in contractors
    ]
    return Response({"count": len(data), "contractors": data})


# ── Unified Manpower API ───────────────────────────────────────────────────────

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║            REAL-WORLD UNIFIED PERSON API                                  ║
# ║  One record per real human. Three roles: Attendance · Payment · Login     ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def _build_person_entry(worker, today_records):
    """Convert an AttendanceWorker + optional Contractor into a unified person dict."""
    from decimal import Decimal as D

    rec = today_records.get(worker.id)
    today_status    = rec.status         if rec else "NOT_MARKED"
    today_check_in  = rec.check_in.strftime("%H:%M")  if rec and rec.check_in  else None
    today_check_out = rec.check_out.strftime("%H:%M") if rec and rec.check_out else None

    # ── Payment role ──────────────────────────────────────────────────────────
    c            = worker.contractor if worker.contractor_id else None
    role_payment = c is not None
    try:
        total_paid  = float(c.total_paid)   if c else None
        balance_due = float(c.balance_due)  if c else None
    except Exception:
        total_paid = balance_due = None

    in_sync = True
    if c:
        in_sync = (
            (c.name or "") == (worker.name or "") and
            (c.phone or "") == (worker.phone or "") and
            (not c.daily_wage or c.daily_wage == worker.daily_rate)
        )

    # ── Login role ────────────────────────────────────────────────────────────
    u          = worker.linked_user
    role_login = u is not None

    return {
        # Identity
        "worker_id":   worker.id,
        "name":        worker.name,
        "trade":       worker.trade,
        "trade_label": worker.get_trade_display(),
        "worker_type": worker.worker_type,
        "phone":       worker.phone,
        "daily_rate":  float(worker.daily_rate),
        "is_active":   worker.is_active,
        "joined_date": str(worker.joined_date) if worker.joined_date else None,
        "notes":       worker.notes,
        # Today
        "today_status":    today_status,
        "today_check_in":  today_check_in,
        "today_check_out": today_check_out,
        # Role: attendance (always true for worker-based rows)
        "role_attendance": True,
        "qr_token":        str(worker.qr_token),
        # Role: payment
        "role_payment":          role_payment,
        "contractor_id":         c.id               if c else None,
        "contractor_role":       c.role             if c else None,
        "contractor_role_label": c.get_role_display() if c else None,
        "total_paid":            total_paid,
        "balance_due":           balance_due,
        "in_sync":               in_sync,
        # Role: login
        "role_login":  role_login,
        "user_id":     u.id                                    if u else None,
        "user_email":  u.email                                 if u else None,
        "user_name":   (u.get_full_name() or u.username)       if u else None,
    }


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def persons_list(request):
    """
    GET /api/v1/attendance/persons/?project=<id>&active=true|false|all
    Flat list of all persons in this project with their three role flags.
    AttendanceWorker is the master record. Contractors with no worker are included as
    'orphan_contractors' so the UI can offer to bring them into the system.
    """
    from apps.resources.models import Contractor

    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    active_param = request.query_params.get("active", "true")
    qs = AttendanceWorker.objects.filter(project_id=project_id).select_related(
        "contractor", "linked_user"
    )
    if active_param == "true":
        qs = qs.filter(is_active=True)
    elif active_param == "false":
        qs = qs.filter(is_active=False)
    # "all" → no filter

    workers = list(qs)
    worker_ids = [w.id for w in workers]

    # Batch-load today's records
    from datetime import date as date_type
    today = date_type.today()
    today_records = {
        r.worker_id: r
        for r in DailyAttendance.objects.filter(worker_id__in=worker_ids, date=today)
    }

    persons = [_build_person_entry(w, today_records) for w in workers]

    # Contractors not yet linked to any attendance worker (orphans)
    orphans = Contractor.objects.filter(
        project_id=project_id,
        attendance_worker__isnull=True,
        is_active=True,
    ).select_related("user").order_by("name")

    orphan_contractors = [
        {
            "contractor_id":    c.id,
            "name":             c.name or (c.user.get_full_name() if c.user else ""),
            "role":             c.role,
            "role_label":       c.get_role_display(),
            "phone":            c.phone,
            "daily_wage":       float(c.daily_wage) if c.daily_wage else None,
        }
        for c in orphans
    ]

    # Summary
    summary = {
        "total":            len(persons),
        "with_payment":     sum(1 for p in persons if p["role_payment"]),
        "with_login":       sum(1 for p in persons if p["role_login"]),
        "active":           sum(1 for p in persons if p["is_active"]),
        "orphan_contractors": len(orphan_contractors),
    }

    return Response({
        "persons":            persons,
        "orphan_contractors": orphan_contractors,
        "summary":            summary,
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def person_add(request):
    """
    POST /api/v1/attendance/persons/add/
    Create a new unified person with selected roles — ONE form, ONE action.

    Body: {
        project:          int,
        name:             str,
        trade:            str,   e.g. "MASON"
        contractor_role:  str,   e.g. "MISTRI" (used only when role_payment=true)
        phone:            str,
        daily_rate:       decimal,
        worker_type:      str    "LABOUR" | "STAFF"  (default LABOUR)
        notes:            str,
        joined_date:      str    "YYYY-MM-DD"  (optional)
        role_attendance:  bool   (default true  — create AttendanceWorker)
        role_payment:     bool   (default false — create Contractor)
    }
    """
    from apps.resources.models import Contractor
    from django.db import transaction
    from django.db.models.signals import post_save
    from apps.attendance.signals import contractor_post_save

    project_id       = request.data.get("project")
    name             = (request.data.get("name") or "").strip()
    trade            = request.data.get("trade", "OTHER")
    contractor_role  = request.data.get("contractor_role", "LABOUR")
    phone            = (request.data.get("phone") or "").strip()
    daily_rate       = request.data.get("daily_rate", 0) or 0
    worker_type      = request.data.get("worker_type", "LABOUR")
    notes            = request.data.get("notes", "")
    joined_date      = request.data.get("joined_date") or None
    role_attendance  = bool(request.data.get("role_attendance", True))
    role_payment     = bool(request.data.get("role_payment", False))

    if not project_id or not name:
        return Response({"error": "project and name are required."}, status=400)
    if not role_attendance and not role_payment:
        return Response({"error": "Enable at least one role (attendance or payment)."}, status=400)

    worker     = None
    contractor = None

    # Disconnect the auto-link signal while we manually create to avoid double-worker
    post_save.disconnect(contractor_post_save, sender=Contractor)
    try:
        with transaction.atomic():
            # ── Create Contractor (payment role) ──────────────────────────────
            if role_payment:
                contractor = Contractor.objects.create(
                    project_id=project_id,
                    name=name,
                    role=contractor_role,
                    phone=phone,
                    daily_wage=daily_rate if daily_rate else None,
                )

            # ── Create AttendanceWorker (attendance role) ─────────────────────
            if role_attendance:
                # Enforce unique_together (project, name)
                final_name = name
                counter    = 1
                while AttendanceWorker.objects.filter(
                    project_id=project_id, name=final_name
                ).exists():
                    final_name = f"{name} ({counter})"
                    counter   += 1

                worker = AttendanceWorker.objects.create(
                    project_id  = project_id,
                    name        = final_name,
                    trade       = trade,
                    worker_type = worker_type,
                    daily_rate  = daily_rate,
                    phone       = phone,
                    notes       = notes,
                    joined_date = joined_date,
                    contractor  = contractor,
                )
    finally:
        post_save.connect(contractor_post_save, sender=Contractor)

    logger.info(
        "person_add: created worker=%s contractor=%s for project=%s name='%s'",
        worker.id if worker else None,
        contractor.id if contractor else None,
        project_id, name,
    )

    return Response({
        "worker_id":     worker.id     if worker     else None,
        "contractor_id": contractor.id if contractor else None,
        "name":          name,
        "roles": {
            "attendance": role_attendance,
            "payment":    role_payment,
        },
    }, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def person_update(request, worker_id):
    """
    PATCH /api/v1/attendance/persons/<worker_id>/update/
    Update core identity fields (name, trade, phone, daily_rate) on the worker
    AND push the same diff to the linked contractor (if any).
    """
    try:
        worker = AttendanceWorker.objects.select_related("contractor").get(
            pk=worker_id
        )
    except AttendanceWorker.DoesNotExist:
        return Response({"error": "Worker not found."}, status=404)

    worker_fields = []
    for field in ("name", "trade", "worker_type", "phone", "notes", "joined_date", "is_active"):
        if field in request.data:
            setattr(worker, field, request.data[field])
            worker_fields.append(field)
    if "daily_rate" in request.data:
        worker.daily_rate = Decimal(str(request.data["daily_rate"]))
        worker_fields.append("daily_rate")

    if worker_fields:
        worker.save(update_fields=worker_fields)

    # Push identity changes to linked contractor (skip signal — direct update)
    if worker.contractor_id and worker.contractor:
        c = worker.contractor
        c_fields = []
        if "name"       in worker_fields: c.name       = worker.name;       c_fields.append("name")
        if "phone"      in worker_fields: c.phone      = worker.phone;      c_fields.append("phone")
        if "daily_rate" in worker_fields: c.daily_wage = worker.daily_rate; c_fields.append("daily_wage")
        if c_fields:
            c.save(update_fields=c_fields)

    return Response(
        AttendanceWorkerSerializer(worker, context={"request": request}).data
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def person_toggle_role(request, worker_id):
    """
    POST /api/v1/attendance/persons/<worker_id>/toggle-role/
    Body: { "role": "payment" | "login", "enable": true | false }

    payment enable  → create Contractor linked to this worker
    payment disable → detach Contractor (does NOT delete — preserves expense history)
    login   enable  → call existing create-account logic
    login   disable → detach linked_user (does NOT delete user account)
    """
    from apps.resources.models import Contractor
    from django.db.models.signals import post_save
    from apps.attendance.signals import contractor_post_save

    try:
        worker = AttendanceWorker.objects.select_related(
            "contractor", "linked_user"
        ).get(pk=worker_id)
    except AttendanceWorker.DoesNotExist:
        return Response({"error": "Worker not found."}, status=404)

    role   = request.data.get("role")
    enable = request.data.get("enable", True)

    # ── Payment role ──────────────────────────────────────────────────────────
    if role == "payment":
        if enable:
            if worker.contractor_id:
                return Response({"message": "Payment role already enabled."})
            # Create new Contractor linked to this worker
            post_save.disconnect(contractor_post_save, sender=Contractor)
            try:
                c = Contractor.objects.create(
                    project_id = worker.project_id,
                    name       = worker.name,
                    role       = request.data.get("contractor_role", "LABOUR"),
                    phone      = worker.phone,
                    daily_wage = worker.daily_rate or None,
                )
                worker.contractor = c
                worker.save(update_fields=["contractor"])
            finally:
                post_save.connect(contractor_post_save, sender=Contractor)
            return Response({"enabled": True, "contractor_id": c.id})
        else:
            # Disable: detach but keep Contractor record (expense history!)
            worker.contractor = None
            worker.save(update_fields=["contractor"])
            return Response({"enabled": False})

    # ── Login role ────────────────────────────────────────────────────────────
    if role == "login":
        if enable:
            if worker.linked_user_id:
                return Response({"message": "Login role already enabled.", "user_id": worker.linked_user_id})
            # Reuse existing create-account view logic
            from django.contrib.auth import get_user_model
            User = get_user_model()
            import secrets, string
            email    = request.data.get("email", "")
            username = request.data.get("username") or (
                worker.name.lower().replace(" ", ".") + "_" + secrets.token_hex(3)
            )
            password = request.data.get("password") or (
                "".join(secrets.choice(string.ascii_letters + string.digits) for _ in range(10))
            )
            if not email:
                return Response({"error": "email is required to create a login."}, status=400)
            if User.objects.filter(email=email).exists():
                return Response({"error": f"An account with email '{email}' already exists."}, status=400)
            user = User.objects.create_user(
                username=username, email=email, password=password,
                first_name=worker.name.split()[0] if worker.name else "",
                last_name=" ".join(worker.name.split()[1:]) if len(worker.name.split()) > 1 else "",
            )
            worker.linked_user = user
            worker.save(update_fields=["linked_user"])
            return Response({
                "enabled": True,
                "user_id": user.id,
                "username": user.username,
                "temp_password": password,
            })
        else:
            worker.linked_user = None
            worker.save(update_fields=["linked_user"])
            return Response({"enabled": False})

    return Response({"error": "role must be 'payment' or 'login'."}, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def person_adopt_contractor(request):
    """
    POST /api/v1/attendance/persons/adopt-contractor/
    Bring an 'orphan' contractor (no attendance worker) into the unified system
    by auto-creating an AttendanceWorker for them.
    Body: { "contractor_id": int, "trade": "MASON" }
    """
    from apps.resources.models import Contractor
    from django.db.models.signals import post_save
    from apps.attendance.signals import contractor_post_save, CONTRACTOR_ROLE_TO_TRADE

    contractor_id = request.data.get("contractor_id")
    trade         = request.data.get("trade")

    try:
        c = Contractor.objects.get(pk=contractor_id)
    except Contractor.DoesNotExist:
        return Response({"error": "Contractor not found."}, status=404)

    if hasattr(c, "attendance_worker") and c.attendance_worker_id:
        return Response({"error": "This contractor already has an attendance worker linked."}, status=400)

    if not c.project_id:
        return Response({"error": "Contractor has no project — cannot create worker."}, status=400)

    # Resolve trade
    resolved_trade = trade or CONTRACTOR_ROLE_TO_TRADE.get(c.role, "OTHER")
    name = c.name or (c.user.get_full_name() if c.user else "Unnamed")

    final_name = name
    counter    = 1
    while AttendanceWorker.objects.filter(project_id=c.project_id, name=final_name).exists():
        final_name = f"{name} ({counter})"
        counter   += 1

    post_save.disconnect(contractor_post_save, sender=Contractor)
    try:
        worker = AttendanceWorker.objects.create(
            project_id  = c.project_id,
            name        = final_name,
            trade       = resolved_trade,
            daily_rate  = c.daily_wage or 0,
            phone       = c.phone or "",
            linked_user = c.user,
            contractor  = c,
        )
    finally:
        post_save.connect(contractor_post_save, sender=Contractor)

    return Response({
        "worker_id":     worker.id,
        "contractor_id": c.id,
        "name":          worker.name,
        "trade":         worker.trade,
    }, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def manpower_overview(request):
    """
    GET /api/v1/attendance/manpower/?project=<id>
    Returns unified view of ALL people in this project across both systems:
    - Attendance workers (with/without contractor link)
    - Contractors not yet linked to any attendance worker

    Response shape:
    {
      "linked":     [ {...worker + contractor data...} ],
      "workers_only":    [ {...worker, no contractor...} ],
      "contractors_only": [ {...contractor, no worker...} ],
      "summary": { "total": N, "linked": N, "workers_only": N, "contractors_only": N }
    }
    """
    from apps.resources.models import Contractor
    from datetime import date as date_type

    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required."}, status=400)

    today = date_type.today()

    # ── All attendance workers ────────────────────────────────────────────────
    workers = AttendanceWorker.objects.filter(
        project_id=project_id,
    ).select_related("contractor", "linked_user")

    # ── Contractors with no worker link ───────────────────────────────────────
    solo_contractors = Contractor.objects.filter(
        project_id=project_id,
        attendance_worker__isnull=True,
        is_active=True,
    ).order_by("name")

    # ── Today's attendance status for workers (efficient batch) ───────────────
    worker_ids = [w.id for w in workers]
    today_records = {
        r.worker_id: r
        for r in DailyAttendance.objects.filter(
            worker_id__in=worker_ids, date=today
        )
    }

    def worker_today_status(w):
        rec = today_records.get(w.id)
        if rec is None:
            return {"status": "NOT_MARKED", "check_in": None, "check_out": None}
        return {
            "status":    rec.status,
            "check_in":  rec.check_in.strftime("%H:%M")  if rec.check_in  else None,
            "check_out": rec.check_out.strftime("%H:%M") if rec.check_out else None,
        }

    linked_list      = []
    workers_only_list = []

    for w in workers:
        entry = {
            "worker_id":    w.id,
            "worker_name":  w.name,
            "trade":        w.trade,
            "trade_label":  w.get_trade_display(),
            "worker_type":  w.worker_type,
            "daily_rate":   float(w.daily_rate),
            "phone":        w.phone,
            "is_active":    w.is_active,
            "has_account":  w.linked_user_id is not None,
            "today":        worker_today_status(w),
        }

        if w.contractor_id:
            c = w.contractor
            entry.update({
                "contractor_id":    c.id,
                "contractor_name":  c.name,
                "contractor_role":  c.role,
                "contractor_role_label": c.get_role_display(),
                "contractor_phone": c.phone,
                "contractor_email": c.email,
                "contractor_daily_wage": float(c.daily_wage) if c.daily_wage else None,
                "in_sync": (
                    c.name == w.name and
                    c.phone == w.phone and
                    (not c.daily_wage or c.daily_wage == w.daily_rate)
                ),
            })
            linked_list.append(entry)
        else:
            entry.update({
                "contractor_id":   None,
                "contractor_name": None,
            })
            workers_only_list.append(entry)

    contractors_only_list = [
        {
            "contractor_id":    c.id,
            "contractor_name":  c.name,
            "contractor_role":  c.role,
            "contractor_role_label": c.get_role_display(),
            "contractor_phone": c.phone,
            "contractor_email": c.email,
            "contractor_daily_wage": float(c.daily_wage) if c.daily_wage else None,
            "worker_id":   None,
            "worker_name": None,
        }
        for c in solo_contractors
    ]

    total = len(linked_list) + len(workers_only_list) + len(contractors_only_list)
    return Response({
        "linked":            linked_list,
        "workers_only":      workers_only_list,
        "contractors_only":  contractors_only_list,
        "summary": {
            "total":             total,
            "linked":            len(linked_list),
            "workers_only":      len(workers_only_list),
            "contractors_only":  len(contractors_only_list),
        },
    })


# ── Daily Attendance ViewSet ───────────────────────────────────────────────────

class DailyAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class   = DailyAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DailyAttendance.objects.select_related("worker", "project", "recorded_by")
        if p := self.request.query_params.get("project"):
            qs = qs.filter(project_id=p)
        if d := self.request.query_params.get("date"):
            qs = qs.filter(date=d)
        if m := self.request.query_params.get("month"):
            try:
                year, mon = map(int, m.split("-"))
                qs = qs.filter(date__year=year, date__month=mon)
            except (ValueError, AttributeError):
                pass
        if w := self.request.query_params.get("worker"):
            qs = qs.filter(worker_id=w)
        if s := self.request.query_params.get("status"):
            qs = qs.filter(status=s)
        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        ser = BulkAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        project_id = ser.validated_data["project"]
        day        = ser.validated_data["date"]
        records    = ser.validated_data["records"]
        created_count = updated_count = 0
        errors = []
        for rec in records:
            try:
                worker = AttendanceWorker.objects.get(pk=rec.get("worker"), project_id=project_id)
            except AttendanceWorker.DoesNotExist:
                errors.append(f"Worker {rec.get('worker')} not found.")
                continue
            _, created = DailyAttendance.objects.update_or_create(
                worker=worker, date=day,
                defaults={
                    "project_id": project_id,
                    "status": rec.get("status", "PRESENT"),
                    "overtime_hours": Decimal(str(rec.get("overtime_hours", 0))),
                    "check_in": rec.get("check_in"),
                    "check_out": rec.get("check_out"),
                    "notes": rec.get("notes", ""),
                    "recorded_by": request.user,
                    **({"daily_rate_snapshot": worker.daily_rate,
                        "overtime_rate_snapshot": worker.effective_overtime_rate()}
                       if created else {}),
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        return Response({"created": created_count, "updated": updated_count, "errors": errors})

    @action(detail=False, methods=["post"], url_path="set-holiday")
    def set_holiday(self, request):
        """
        POST /api/v1/attendance/daily/set-holiday/
        Body: { "project": <id>, "date": "YYYY-MM-DD", "name": "Holiday Name" }
        Marks all active workers in the project as HOLIDAY for that date.
        """
        project_id = request.data.get("project")
        day        = request.data.get("date")
        name       = request.data.get("name", "Public Holiday")
        
        if not project_id or not day:
            return Response({"error": "project and date are required."}, status=400)
            
        # 1. Save to ProjectHoliday model
        ProjectHoliday.objects.update_or_create(
            project_id=project_id, date=day,
            defaults={"name": name}
        )
        
        # 2. Bulk update/create DailyAttendance
        active_workers = AttendanceWorker.objects.filter(project_id=project_id, is_active=True)
        count = 0
        for w in active_workers:
            _, created = DailyAttendance.objects.update_or_create(
                worker=w, date=day,
                defaults={
                    "project_id": project_id,
                    "status": "HOLIDAY",
                    "notes": name,
                    "recorded_by": request.user,
                    "daily_rate_snapshot": w.daily_rate,
                    "overtime_rate_snapshot": w.effective_overtime_rate()
                }
            )
            count += 1
            
        return Response({
            "status": "success",
            "message": f"Marked {count} workers as HOLIDAY for {day} ({name})."
        })

    @action(detail=False, methods=["get"], url_path="live")
    def live(self, request):
        project = request.query_params.get("project")
        if not project:
            return Response({"error": "project is required"}, status=400)
        today   = date_type.today()
        records = DailyAttendance.objects.filter(
            project_id=project, date=today
        ).select_related("worker")
        attended_ids = {r.worker_id for r in records}
        absent_workers = AttendanceWorker.objects.filter(
            project_id=project, is_active=True
        ).exclude(id__in=attended_ids)

        def fmt(r):
            return {
                "worker_id": r.worker_id, "worker_name": r.worker.name,
                "trade": r.worker.get_trade_display(), "status": r.status,
                "check_in":  r.check_in.strftime("%H:%M")  if r.check_in  else None,
                "check_out": r.check_out.strftime("%H:%M") if r.check_out else None,
                "overtime_hours": float(r.overtime_hours),
                "wage_earned": float(r.wage_earned),
            }

        on_site, left, not_yet = [], [], []
        for r in records:
            item = fmt(r)
            if r.status in ("PRESENT", "HALF_DAY") and r.check_in and not r.check_out:
                on_site.append(item)
            elif r.check_out:
                left.append(item)
            else:
                not_yet.append(item)

        absent_list = [{"worker_id": w.id, "worker_name": w.name,
                        "trade": w.get_trade_display(), "status": "NOT_MARKED"}
                       for w in absent_workers]

        return Response({
            "date": str(today),
            "on_site": on_site, "left": left, "not_yet": not_yet + absent_list,
            "counts": {"on_site": len(on_site), "left": len(left),
                       "unmarked": len(not_yet) + len(absent_list)},
        })

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        project = request.query_params.get("project")
        month   = request.query_params.get("month")
        if not project or not month:
            return Response({"error": "project and month (YYYY-MM) are required."}, status=400)
        try:
            year, mon = map(int, month.split("-"))
        except ValueError:
            return Response({"error": "month must be YYYY-MM"}, status=400)
        _, days_in_month = calendar.monthrange(year, mon)
        records = DailyAttendance.objects.filter(
            project_id=project, date__year=year, date__month=mon
        ).select_related("worker")
        worker_map = {}
        for rec in records:
            wid = rec.worker_id
            if wid not in worker_map:
                worker_map[wid] = {
                    "worker_id": wid, "worker_name": rec.worker.name,
                    "trade": rec.worker.get_trade_display(), "worker_type": rec.worker.worker_type,
                    "daily_rate": float(rec.worker.daily_rate),
                    "days_present": 0, "days_absent": 0, "days_half": 0,
                    "days_leave": 0, "days_holiday": 0,
                    "effective_days": 0.0, "total_overtime_hours": 0.0,
                    "total_wage": 0.0, "total_overtime_pay": 0.0, "grand_total": 0.0,
                }
            w = worker_map[wid]
            STATUS_KEY = {"PRESENT": "days_present", "ABSENT": "days_absent",
                          "HALF_DAY": "days_half", "LEAVE": "days_leave", "HOLIDAY": "days_holiday"}
            if rec.status in STATUS_KEY:
                w[STATUS_KEY[rec.status]] += 1
            base = float(rec.daily_rate_snapshot * rec.effective_days)
            ot   = float(rec.overtime_hours * rec.overtime_rate_snapshot)
            w["effective_days"]       += float(rec.effective_days)
            w["total_overtime_hours"] += float(rec.overtime_hours)
            w["total_wage"]           += base
            w["total_overtime_pay"]   += ot
            w["grand_total"]          += base + ot
        workers_summary = list(worker_map.values())
        return Response({
            "workers": workers_summary,
            "totals": {
                "total_workers": len(workers_summary),
                "total_wage_bill": round(sum(w["grand_total"] for w in workers_summary), 2),
                "days_in_month": days_in_month, "month": month, "project_id": project,
            },
        })

    @action(detail=False, methods=["post"], url_path="post-to-finance")
    def post_to_finance(self, request):
        from apps.finance.models import Expense, BudgetCategory
        project_id  = request.data.get("project")
        month       = request.data.get("month")
        category_id = request.data.get("category")
        funding_id  = request.data.get("funding_source")
        if not project_id or not month or not category_id:
            return Response({"error": "project, month, and category are required."}, status=400)
        summary_resp = self.summary(request)
        if summary_resp.status_code != 200:
            return summary_resp
        total_wage = summary_resp.data["totals"]["total_wage_bill"]
        if total_wage <= 0:
            return Response({"error": "No wages to post."}, status=400)
        title = f"Payroll for {month}"
        if Expense.objects.filter(project_id=project_id, title=title).exists():
            return Response({"error": f"Payroll for {month} already posted."}, status=400)
        try:
            category = BudgetCategory.objects.get(pk=category_id, project_id=project_id)
        except BudgetCategory.DoesNotExist:
            return Response({"error": "Budget Category not found."}, status=404)
        expense = Expense.objects.create(
            project_id=project_id, title=title, amount=total_wage,
            date=date_type.today(), category=category,
            funding_source_id=funding_id,
            paid_to=f"Project Workers ({month})",
            notes=f"Total wage bill for {month}. Auto-generated from Attendance.",
        )
        return Response({"status": "success", "expense_id": expense.id,
                         "amount": total_wage, "message": f"Payroll for {month} posted."})

    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        summary_resp = self.summary(request)
        if summary_resp.status_code != 200:
            return summary_resp
        data  = summary_resp.data
        month = request.query_params.get("month", "summary")
        import csv
        from django.http import HttpResponse
        resp = HttpResponse(content_type="text/csv")
        resp["Content-Disposition"] = f'attachment; filename="attendance_{month}.csv"'
        writer = csv.writer(resp)
        writer.writerow(["Worker","Trade","Type","Present","Absent","Half","Leave",
                         "Eff.Days","OT Hrs","Base Wage","OT Pay","Total"])
        for w in data["workers"]:
            writer.writerow([w["worker_name"], w["trade"], w["worker_type"],
                             w["days_present"], w["days_absent"], w["days_half"], w["days_leave"],
                             w["effective_days"], w["total_overtime_hours"],
                             w["total_wage"], w["total_overtime_pay"], w["grand_total"]])
        writer.writerow([])
        writer.writerow(["GRAND TOTAL","","","","","","","","","","",
                          data["totals"]["total_wage_bill"]])
        return resp
