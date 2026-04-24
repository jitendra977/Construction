"""
AccountViewSet — CRUD for Chart of Accounts.

Extra actions
-------------
POST /accounts/{id}/deposit/   — add a deposit / opening balance
POST /accounts/{id}/pay-emi/   — pay one monthly EMI for a loan account
"""
import datetime
from decimal import Decimal

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models.account import Account, AccountType
from ..models.loan import LoanEMIPayment
from ..serializers.account import AccountSerializer
from ..serializers.loan import LoanEMIPaymentSerializer
from ..services.banking import BankingService
from ..services.loan import LoanService


def _pid(request):
    """Extract integer project_id from query params or body."""
    raw = request.query_params.get("project") or request.data.get("project")
    if raw and str(raw) not in ("", "null", "undefined"):
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer

    def get_queryset(self):
        qs  = Account.objects.filter(is_active=True).order_by("code")
        pid = _pid(self.request)

        if pid:
            from django.db.models import Q
            qs = qs.filter(Q(project_id=pid) | Q(project__isnull=True, is_bank=False))

        # Optional filters
        for param, field in [
            ("account_type", "account_type"),
            ("is_bank",      "is_bank"),
            ("is_loan",      "is_loan"),
        ]:
            val = self.request.query_params.get(param)
            if val is not None:
                if val.lower() in ("true", "false"):
                    qs = qs.filter(**{field: val.lower() == "true"})
                else:
                    qs = qs.filter(**{field: val})

        return qs

    def perform_create(self, serializer):
        pid = _pid(self.request)
        serializer.save(project_id=pid)

    # ── POST /accounts/{id}/deposit/ ─────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="deposit")
    def deposit(self, request, pk=None):
        account = self.get_object()
        amount  = request.data.get("amount")
        ref     = request.data.get("reference", "")

        if not amount:
            return Response({"error": "amount is required."}, status=400)
        try:
            amount = Decimal(str(amount))
            assert amount > 0
        except Exception:
            return Response({"error": "amount must be a positive number."}, status=400)

        try:
            with transaction.atomic():
                BankingService.deposit(account, amount, ref, user=request.user)
            return Response({"status": "ok", "message": f"NPR {amount:,} deposited into {account.name}."})
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)

    # ── POST /accounts/{id}/pay-emi/ ─────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="pay-emi")
    def pay_emi(self, request, pk=None):
        loan_account = self.get_object()
        if not loan_account.is_loan:
            return Response({"error": "This account is not a loan account."}, status=400)

        data = request.data.copy()
        data["loan_account"] = str(loan_account.id)
        data.setdefault("date", str(datetime.date.today()))

        ser = LoanEMIPaymentSerializer(data=data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        try:
            with transaction.atomic():
                emi = ser.save()
                LoanService.pay_emi(emi, user=request.user)
            return Response(LoanEMIPaymentSerializer(emi).data, status=201)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
