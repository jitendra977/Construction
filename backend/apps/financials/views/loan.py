"""
Loan views — Disbursements and EMI Payments.
"""
from django.db import transaction
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from ..models.loan import LoanDisbursement, LoanEMIPayment
from ..serializers.loan import LoanDisbursementSerializer, LoanEMIPaymentSerializer
from ..services.loan import LoanService


def _pid(request):
    raw = request.query_params.get("project") or request.data.get("project")
    if raw and str(raw) not in ("", "null", "undefined"):
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None


class LoanDisbursementViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class  = LoanDisbursementSerializer

    def get_queryset(self):
        qs  = LoanDisbursement.objects.select_related("loan_account", "bank_account").order_by("-date")
        pid = _pid(self.request)
        if pid:
            qs = qs.filter(loan_account__project_id=pid)
        loan_id = self.request.query_params.get("loan_account")
        if loan_id:
            qs = qs.filter(loan_account_id=loan_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            disbursement = serializer.save()
            LoanService.disburse(
                disbursement,
                user=self.request.user if self.request.user.is_authenticated else None,
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            disbursement = serializer.save()
            LoanService.update_disbursement(
                disbursement,
                user=self.request.user if self.request.user.is_authenticated else None,
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            LoanService.delete_disbursement(instance)


class LoanEMIPaymentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class  = LoanEMIPaymentSerializer

    def get_queryset(self):
        qs  = LoanEMIPayment.objects.select_related("loan_account", "bank_account").order_by("-date")
        pid = _pid(self.request)
        if pid:
            qs = qs.filter(loan_account__project_id=pid)
        loan_id = self.request.query_params.get("loan_account")
        if loan_id:
            qs = qs.filter(loan_account_id=loan_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            emi = serializer.save()
            LoanService.pay_emi(
                emi,
                user=self.request.user if self.request.user.is_authenticated else None,
            )

    def perform_update(self, serializer):
        with transaction.atomic():
            emi = serializer.save()
            LoanService.update_emi(
                emi,
                user=self.request.user if self.request.user.is_authenticated else None,
            )

    def perform_destroy(self, instance):
        with transaction.atomic():
            LoanService.delete_emi(instance)
