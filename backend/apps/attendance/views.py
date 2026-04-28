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

from .models import AttendanceWorker, DailyAttendance, QRScanLog
from .serializers import (
    AttendanceWorkerSerializer,
    DailyAttendanceSerializer,
    BulkAttendanceSerializer,
    QRScanLogSerializer,
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


# ── QR Scan (AllowAny - kiosk/tablet use) ─────────────────────────────────────

@api_view(["POST"])
@permission_classes([AllowAny])
def qr_scan(request):
    """
    POST /api/v1/attendance/qr-scan/
    Body: { "qr_data": "<JSON string from QR code>" }
    - No check-in today  → create record, set check_in = now
    - check_in exists, no check_out → set check_out = now, auto-calc overtime
    - both exist → update check_out (overtime re-scan)
    """
    raw = request.data.get("qr_data", "")
    if not raw:
        return Response({"error": "qr_data is required."}, status=400)

    try:
        payload = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
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

    now      = timezone.localtime()
    today    = now.date()
    time_now = now.time()
    scanned_by = request.user if request.user.is_authenticated else None

    # ── Duplicate-scan guard: ignore if same worker scanned within last 60 s ──
    COOLDOWN_SECONDS = 60
    from datetime import timedelta
    cutoff = now - timedelta(seconds=COOLDOWN_SECONDS)
    last_scan = QRScanLog.objects.filter(
        worker=worker,
        scanned_at__gte=cutoff,
    ).exclude(scan_type="IGNORED").order_by("-scanned_at").first()

    if last_scan:
        seconds_ago = int((now - last_scan.scanned_at).total_seconds())
        wait = COOLDOWN_SECONDS - seconds_ago
        # Log it as IGNORED so the audit trail is complete
        QRScanLog.objects.create(
            worker=worker, attendance=None, scan_type="IGNORED",
            scanned_at=now, scanned_by=scanned_by,
            ip_address=_get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            note=f"Duplicate scan ignored ({seconds_ago}s after last scan)",
        )
        return Response({
            "success":  False,
            "action":   "IGNORED",
            "message":  f"Already scanned {seconds_ago}s ago. Please wait {wait}s.",
            "worker":   {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
            "project":  {"id": worker.project_id, "name": worker.project.name},
            "cooldown_remaining": wait,
        }, status=200)

    record, created = DailyAttendance.objects.get_or_create(
        worker=worker,
        date=today,
        defaults={
            "project":    worker.project,
            "status":     "PRESENT",
            "check_in":   time_now,
            "recorded_by": scanned_by,
        },
    )

    if created:
        scan_type  = "CHECK_IN"
        action_msg = f"Checked in at {time_now.strftime('%I:%M %p')}"
    elif record.check_out is None:
        record.check_out = time_now
        record.save(update_fields=["check_out"])
        # Auto overtime
        if record.check_in:
            dt_in  = datetime.combine(today, record.check_in)
            dt_out = datetime.combine(today, time_now)
            worked = (dt_out - dt_in).total_seconds() / 3600
            if worked > 8:
                record.overtime_hours = Decimal(str(round(worked - 8, 2)))
                record.save(update_fields=["overtime_hours"])
        scan_type  = "CHECK_OUT"
        action_msg = f"Checked out at {time_now.strftime('%I:%M %p')}"
    else:
        record.check_out = time_now
        record.save(update_fields=["check_out"])
        scan_type  = "CHECK_OUT"
        action_msg = f"Check-out updated to {time_now.strftime('%I:%M %p')}"

    QRScanLog.objects.create(
        worker=worker, attendance=record, scan_type=scan_type,
        scanned_at=now, scanned_by=scanned_by,
        ip_address=_get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
    )

    return Response({
        "success": True,
        "action":  scan_type,
        "message": action_msg,
        "worker":  {"id": worker.id, "name": worker.name, "trade": worker.get_trade_display()},
        "project": {"id": worker.project_id, "name": worker.project.name},
        "attendance": {
            "date":           str(today),
            "status":         record.status,
            "check_in":       record.check_in.strftime("%H:%M")  if record.check_in  else None,
            "check_out":      record.check_out.strftime("%H:%M") if record.check_out else None,
            "overtime_hours": float(record.overtime_hours),
        },
    })


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
