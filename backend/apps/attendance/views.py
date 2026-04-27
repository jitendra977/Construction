from decimal import Decimal
from datetime import date as date_type
import calendar

from django.db.models import Sum, Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AttendanceWorker, DailyAttendance
from .serializers import (
    AttendanceWorkerSerializer,
    DailyAttendanceSerializer,
    BulkAttendanceSerializer,
)


class AttendanceWorkerViewSet(viewsets.ModelViewSet):
    serializer_class   = AttendanceWorkerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AttendanceWorker.objects.select_related("project", "linked_user")
        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(project_id=project)
        active = self.request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        worker_type = self.request.query_params.get("worker_type")
        if worker_type:
            qs = qs.filter(worker_type=worker_type)
        return qs


class DailyAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class   = DailyAttendanceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = DailyAttendance.objects.select_related("worker", "project", "recorded_by")

        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(project_id=project)

        # Filter by exact date
        d = self.request.query_params.get("date")
        if d:
            qs = qs.filter(date=d)

        # Filter by month  (YYYY-MM)
        month = self.request.query_params.get("month")
        if month:
            try:
                year, mon = map(int, month.split("-"))
                qs = qs.filter(date__year=year, date__month=mon)
            except (ValueError, AttributeError):
                pass

        worker = self.request.query_params.get("worker")
        if worker:
            qs = qs.filter(worker_id=worker)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)

    # ── Bulk mark attendance for one day ─────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk(self, request):
        """
        POST /api/v1/attendance/records/bulk/
        {
          "project": 1,
          "date": "2026-04-27",
          "records": [
            {"worker": 3, "status": "PRESENT", "overtime_hours": 2, "notes": ""},
            {"worker": 4, "status": "ABSENT",  "overtime_hours": 0, "notes": "sick"}
          ]
        }
        """
        ser = BulkAttendanceSerializer(data=request.data)
        ser.is_valid(raise_exception=True)

        project_id = ser.validated_data["project"]
        day        = ser.validated_data["date"]
        records    = ser.validated_data["records"]

        created_count = 0
        updated_count = 0
        errors        = []

        for rec in records:
            worker_id = rec.get("worker")
            try:
                worker = AttendanceWorker.objects.get(pk=worker_id, project_id=project_id)
            except AttendanceWorker.DoesNotExist:
                errors.append(f"Worker {worker_id} not found in project.")
                continue

            obj, created = DailyAttendance.objects.update_or_create(
                worker=worker,
                date=day,
                defaults={
                    "project_id": project_id,
                    "status":         rec.get("status", "PRESENT"),
                    "overtime_hours": Decimal(str(rec.get("overtime_hours", 0))),
                    "check_in":       rec.get("check_in"),
                    "check_out":      rec.get("check_out"),
                    "notes":          rec.get("notes", ""),
                    "recorded_by":    request.user,
                    # Snapshot rates on create
                    **({"daily_rate_snapshot": worker.daily_rate,
                        "overtime_rate_snapshot": worker.effective_overtime_rate()}
                       if created else {}),
                },
            )
            # On update, don't overwrite snapshots
            if not created:
                updated_count += 1
            else:
                created_count += 1

        return Response({
            "created": created_count,
            "updated": updated_count,
            "errors":  errors,
        })

    # ── Monthly summary ───────────────────────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        GET /api/v1/attendance/records/summary/?project=1&month=2026-04
        Returns per-worker totals for a month.
        """
        project = request.query_params.get("project")
        month   = request.query_params.get("month")

        if not project or not month:
            return Response(
                {"error": "project and month (YYYY-MM) are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            year, mon = map(int, month.split("-"))
        except ValueError:
            return Response({"error": "month must be YYYY-MM"}, status=400)

        _, days_in_month = calendar.monthrange(year, mon)

        records = DailyAttendance.objects.filter(
            project_id=project,
            date__year=year,
            date__month=mon,
        ).select_related("worker")

        # Aggregate per worker
        worker_map = {}
        for rec in records:
            wid = rec.worker_id
            if wid not in worker_map:
                worker_map[wid] = {
                    "worker_id":    wid,
                    "worker_name":  rec.worker.name,
                    "trade":        rec.worker.get_trade_display(),
                    "worker_type":  rec.worker.worker_type,
                    "daily_rate":   float(rec.worker.daily_rate),
                    "days_present": 0,
                    "days_absent":  0,
                    "days_half":    0,
                    "days_leave":   0,
                    "days_holiday": 0,
                    "effective_days": 0.0,
                    "total_overtime_hours": 0.0,
                    "total_wage":   0.0,
                    "total_overtime_pay": 0.0,
                    "grand_total":  0.0,
                }
            w = worker_map[wid]

            if rec.status == "PRESENT":
                w["days_present"] += 1
            elif rec.status == "ABSENT":
                w["days_absent"] += 1
            elif rec.status == "HALF_DAY":
                w["days_half"] += 1
            elif rec.status == "LEAVE":
                w["days_leave"] += 1
            elif rec.status == "HOLIDAY":
                w["days_holiday"] += 1

            w["effective_days"]         += float(rec.effective_days)
            w["total_overtime_hours"]   += float(rec.overtime_hours)
            w["total_wage"]             += float(rec.daily_rate_snapshot * rec.effective_days)
            ot_pay = float(rec.overtime_hours * rec.overtime_rate_snapshot)
            w["total_overtime_pay"]     += ot_pay
            w["grand_total"]            += float(rec.daily_rate_snapshot * rec.effective_days) + ot_pay

        workers_summary = list(worker_map.values())

        # Totals row
        totals = {
            "total_workers":        len(workers_summary),
            "total_wage_bill":      round(sum(w["grand_total"] for w in workers_summary), 2),
            "days_in_month":        days_in_month,
            "month":                month,
            "project_id":           project,
        }

        return Response({"workers": workers_summary, "totals": totals})
