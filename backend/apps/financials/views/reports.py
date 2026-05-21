"""
Finance Reports View — generates summary reports.

GET /financials/reports/?type=<type>&project=<id>&months=<n>
"""
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models.expense import Expense
from ..models.bill import Bill
from ..models.account import Account


class FinanceReportsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        report_type = request.query_params.get("type", "summary")
        pid = request.query_params.get("project")
        months = int(request.query_params.get("months", 6))

        try:
            pid = int(pid) if pid and pid not in ("", "null") else None
        except ValueError:
            pid = None

        since = timezone.now() - timedelta(days=months * 30)

        if report_type == "expense_summary":
            return self._expense_summary(pid, since)
        elif report_type == "cash_flow":
            return self._cash_flow(pid, since)
        else:
            return self._summary(pid, since)

    def _summary(self, pid, since):
        expense_qs = Expense.objects.filter(date__gte=since)
        bill_qs = Bill.objects.filter(date__gte=since)
        if pid:
            expense_qs = expense_qs.filter(project_id=pid)
            bill_qs = bill_qs.filter(project_id=pid)

        total_expenses = expense_qs.aggregate(t=Sum("amount"))["t"] or Decimal("0")
        total_billed = sum((b.total_amount for b in bill_qs), Decimal("0"))
        total_paid = sum((b.paid_amount for b in bill_qs), Decimal("0"))

        return Response({
            "type": "summary",
            "period_months": int((timezone.now() - since).days / 30),
            "total_expenses": float(total_expenses),
            "total_billed": float(total_billed),
            "total_paid": float(total_paid),
            "outstanding": float(total_billed - total_paid),
        })

    def _expense_summary(self, pid, since):
        qs = Expense.objects.filter(date__gte=since)
        if pid:
            qs = qs.filter(project_id=pid)

        by_category = qs.values("budget_category__name").annotate(
            total=Sum("amount")
        ).order_by("-total")

        return Response({
            "type": "expense_summary",
            "categories": [
                {
                    "category": item["budget_category__name"] or "Uncategorized",
                    "total": float(item["total"]),
                }
                for item in by_category
            ],
        })

    def _cash_flow(self, pid, since):
        bank_qs = Account.objects.filter(is_bank=True, is_active=True)
        if pid:
            bank_qs = bank_qs.filter(project_id=pid)

        total_balance = sum((a.balance for a in bank_qs), Decimal("0"))

        return Response({
            "type": "cash_flow",
            "total_bank_balance": float(total_balance),
            "bank_count": bank_qs.count(),
        })
