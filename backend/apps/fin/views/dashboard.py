"""
FinanceDashboardView — single API call that returns all summary numbers
the Finance module dashboard needs.

GET /fin/dashboard/?project=<id>
"""
from decimal import Decimal
from django.db.models import Sum, Count, Q
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models.account import Account, AccountType
from ..models.bill import Bill
from ..models.transfer import CashTransfer
from ..models.loan import LoanEMIPayment


class FinanceDashboardView(APIView):

    def get(self, request):
        pid = request.query_params.get("project")
        try:
            pid = int(pid) if pid and pid not in ("", "null") else None
        except ValueError:
            pid = None

        # ── 1. Bank balances ─────────────────────────────────────────────────
        bank_qs = Account.objects.filter(is_bank=True, is_active=True)
        if pid:
            bank_qs = bank_qs.filter(project_id=pid)

        banks = []
        total_cash = Decimal("0")
        for acc in bank_qs:
            bal = acc.balance
            total_cash += bal
            banks.append({
                "id":             str(acc.id),
                "name":           acc.name,
                "bank_name":      acc.bank_name,
                "account_number": acc.account_number,
                "balance":        float(bal),
            })

        # ── 2. Loan balances ─────────────────────────────────────────────────
        loan_qs = Account.objects.filter(is_loan=True, is_active=True)
        if pid:
            loan_qs = loan_qs.filter(project_id=pid)

        loans = []
        total_outstanding = Decimal("0")
        for acc in loan_qs:
            bal = abs(acc.balance)
            total_outstanding += bal
            loans.append({
                "id":               str(acc.id),
                "name":             acc.name,
                "outstanding":      float(bal),
                "emi_amount":       float(acc.emi_amount or 0),
                "interest_rate":    float(acc.interest_rate or 0),
                "total_loan_limit": float(acc.total_loan_limit or 0),
            })

        # ── 3. Bills summary ─────────────────────────────────────────────────
        bill_qs = Bill.objects.all()
        if pid:
            bill_qs = bill_qs.filter(project_id=pid)

        all_bills = list(bill_qs)
        total_billed  = sum((b.total_amount  for b in all_bills), Decimal("0"))
        total_paid    = sum((b.paid_amount    for b in all_bills), Decimal("0"))
        total_due     = sum((b.outstanding   for b in all_bills), Decimal("0"))
        overdue_count = sum(1 for b in all_bills if b.is_overdue)
        overdue_amt   = sum((b.outstanding   for b in all_bills if b.is_overdue), Decimal("0"))

        # ── 4. Recent transfers ───────────────────────────────────────────────
        tx_qs = CashTransfer.objects.select_related("from_account", "to_account").order_by("-date")
        if pid:
            tx_qs = tx_qs.filter(
                Q(from_account__project_id=pid) | Q(to_account__project_id=pid) | Q(project_id=pid)
            )
        recent_transfers = [
            {
                "date":      str(t.date),
                "from":      t.from_account.name,
                "to":        t.to_account.name,
                "amount":    float(t.amount),
                "reference": t.reference,
            }
            for t in tx_qs[:5]
        ]

        return Response({
            "project_id": pid,
            "banking": {
                "total_cash": float(total_cash),
                "accounts":   banks,
            },
            "loans": {
                "total_outstanding": float(total_outstanding),
                "accounts":          loans,
            },
            "bills": {
                "total_billed":  float(total_billed),
                "total_paid":    float(total_paid),
                "total_due":     float(total_due),
                "overdue_count": overdue_count,
                "overdue_amount": float(overdue_amt),
            },
            "recent_transfers": recent_transfers,
        })
