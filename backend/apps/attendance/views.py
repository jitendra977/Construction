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

# Role → trade mapping for auto-fill when importing team members
ROLE_TO_TRADE = {
    "OWNER":      "MANAGER",
    "MANAGER":    "MANAGER",
    "ENGINEER":   "ENGINEER",
    "SUPERVISOR": "SUPERVISOR",
    "CONTRACTOR": "OTHER",
    "VIEWER":     "OTHER",
}


class AttendanceWorkerViewSet(viewsets.ModelViewSet):
    serializer_class   = AttendanceWorkerSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = AttendanceWorker.objects.select_related(
            "project", "linked_user", "project_member", "project_member__user"
        )
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

    # ── List team members not yet imported as attendance workers ─────────────
    @action(detail=False, methods=["get"], url_path="team-unlinked")
    def team_unlinked(self, request):
        """
        GET /api/v1/attendance/workers/team-unlinked/?project=1
        Returns ProjectMembers for this project that don't yet have an
        AttendanceWorker linked, so the frontend can offer "Import from Team".
        """
        from apps.core.models import ProjectMember
        project_id = request.query_params.get("project")
        if not project_id:
            return Response({"error": "project is required"}, status=400)

        # Members that already have an attendance worker for this project
        already_linked = AttendanceWorker.objects.filter(
            project_id=project_id,
            project_member__isnull=False,
        ).values_list("project_member_id", flat=True)

        members = ProjectMember.objects.filter(
            project_id=project_id,
        ).exclude(
            id__in=already_linked,
        ).select_related("user")

        data = []
        for m in members:
            u = m.user
            data.append({
                "member_id":   m.id,
                "role":        m.role,
                "note":        m.note,
                "user_id":     u.id,
                "name":        u.get_full_name() or u.username,
                "email":       u.email,
                "phone":       getattr(u, "phone_number", "") or "",
                "suggested_trade": ROLE_TO_TRADE.get(m.role, "OTHER"),
            })
        return Response(data)

    # ── Import a team member as an attendance worker ──────────────────────────
    @action(detail=False, methods=["post"], url_path="import-member")
    def import_member(self, request):
        """
        POST /api/v1/attendance/workers/import-member/
        {
          "project": 1,
          "member_id": 5,
          "daily_rate": 1500,
          "worker_type": "STAFF"   // optional, default STAFF
        }
        Creates an AttendanceWorker linked to the ProjectMember.
        """
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

        # Check not already linked
        if AttendanceWorker.objects.filter(project_member=member).exists():
            return Response({"error": "This team member is already an attendance worker."}, status=400)

        u = member.user
        worker = AttendanceWorker.objects.create(
            project_id     = project_id,
            name           = u.get_full_name() or u.username,
            trade          = ROLE_TO_TRADE.get(member.role, "OTHER"),
            worker_type    = worker_type,
            daily_rate     = daily_rate,
            phone          = getattr(u, "phone_number", "") or "",
            linked_user    = u,
            project_member = member,
            notes          = f"Imported from project team ({member.get_role_display()})",
        )
        return Response(AttendanceWorkerSerializer(worker, context={"request": request}).data, status=201)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        """GET /api/v1/attendance/workers/{id}/history/"""
        worker = self.get_object()
        records = list(DailyAttendance.objects.filter(worker=worker).order_by("-date")[:100])

        # wage_earned is a @property so we sum in Python, not via ORM
        total_wage = sum(float(r.wage_earned) for r in records)
        total_ot   = sum(float(r.overtime_hours) for r in records)

        stats = {
            "total_days": len(records),
            "total_wage": round(total_wage, 2),
            "total_ot":   round(total_ot, 2),
        }

        return Response({
            "worker":  worker.name,
            "stats":   stats,
            "records": DailyAttendanceSerializer(records, many=True).data,
        })


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
    # ── Post monthly payroll to Finance module ──────────────────────────────
    @action(detail=False, methods=["post"], url_path="post-to-finance")
    def post_to_finance(self, request):
        """
        POST /api/v1/attendance/records/post-to-finance/
        {
          "project": 1,
          "month": "2026-04",
          "category": 5,        // BudgetCategory ID
          "funding_source": 2   // Optional FundingSource ID
        }
        """
        from apps.finance.models import Expense, BudgetCategory
        project_id = request.data.get("project")
        month      = request.data.get("month")
        category_id = request.data.get("category")
        funding_id  = request.data.get("funding_source")

        if not project_id or not month or not category_id:
            return Response({"error": "project, month, and category are required."}, status=400)

        # 1. Calculate total wage bill for the month
        summary_resp = self.summary(request)
        if summary_resp.status_code != 200:
            return summary_resp
        
        total_wage = summary_resp.data["totals"]["total_wage_bill"]
        if total_wage <= 0:
            return Response({"error": "No wages to post for this month."}, status=400)

        # 2. Check if already posted (prevent duplicates)
        title = f"Payroll for {month}"
        if Expense.objects.filter(project_id=project_id, title=title).exists():
            return Response({"error": f"Payroll for {month} has already been posted to Finance."}, status=400)

        # 3. Create Expense
        try:
            category = BudgetCategory.objects.get(pk=category_id, project_id=project_id)
        except BudgetCategory.DoesNotExist:
            return Response({"error": "Budget Category not found."}, status=404)

        expense = Expense.objects.create(
            project_id=project_id,
            title=title,
            amount=total_wage,
            date=date_type.today(),
            category=category,
            funding_source_id=funding_id,
            paid_to=f"Project Workers ({month})",
            notes=f"Total wage bill for {month}. Auto-generated from Attendance module.",
        )

        return Response({
            "status": "success",
            "expense_id": expense.id,
            "amount": total_wage,
            "message": f"Payroll for {month} posted to Finance as an expense."
        })

    # ── Export monthly summary to CSV ───────────────────────────────────────
    @action(detail=False, methods=["get"], url_path="export-csv")
    def export_csv(self, request):
        """GET /api/v1/attendance/records/export-csv/?project=1&month=2026-04"""
        summary_resp = self.summary(request)
        if summary_resp.status_code != 200:
            return summary_resp
        
        data = summary_resp.data
        month = request.query_params.get("month", "summary")
        
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = f'attachment; filename="attendance_{month}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(["Worker", "Trade", "Type", "Present", "Absent", "Half Day", "Leave", "Effective Days", "OT Hours", "Base Wage", "OT Pay", "Total"])
        
        for w in data["workers"]:
            writer.writerow([
                w["worker_name"], w["trade"], w["worker_type"],
                w["days_present"], w["days_absent"], w["days_half"], w["days_leave"],
                w["effective_days"], w["total_overtime_hours"],
                w["total_wage"], w["total_overtime_pay"], w["grand_total"]
            ])
            
        writer.writerow([])
        writer.writerow(["GRAND TOTAL", "", "", "", "", "", "", "", "", "", "", data["totals"]["total_wage_bill"]])
        
        return response
