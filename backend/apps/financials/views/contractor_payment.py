"""
ViewSets for ContractorContract + ContractorInstallment + InstallmentPayment.

Endpoints
─────────
GET/POST        /fin/contractor-contracts/
GET/PATCH/DEL   /fin/contractor-contracts/{id}/

GET/POST        /fin/contractor-installments/
GET/PATCH/DEL   /fin/contractor-installments/{id}/
POST            /fin/contractor-installments/{id}/add_payment/   ← add tranche
POST            /fin/contractor-installments/{id}/reset/         ← clear all payments

GET             /fin/installment-payments/
DELETE          /fin/installment-payments/{id}/                  ← delete one tranche
"""
from decimal import Decimal
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..models.contractor_payment import (
    ContractorContract, ContractorInstallment, InstallmentPayment
)
from ..models.account import Account
from ..serializers.contractor_payment import (
    ContractorContractSerializer,
    ContractorInstallmentSerializer,
    InstallmentPaymentSerializer,
    AddPaymentSerializer,
)
from ..services.ledger import LedgerService
from ..models.journal import EntryType, SourceType


class ContractorContractViewSet(viewsets.ModelViewSet):
    """CRUD for contractor contracts, filtered by project."""
    permission_classes = [IsAuthenticated]
    serializer_class   = ContractorContractSerializer

    def get_queryset(self):
        qs = ContractorContract.objects.prefetch_related(
            "fin_installments__fin_payments__bank_account",
            "fin_installments__fin_payments__expense_account",
        )
        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(project_id=project)
        return qs


class ContractorInstallmentViewSet(viewsets.ModelViewSet):
    """CRUD + add_payment / reset actions for individual installments."""
    permission_classes = [IsAuthenticated]
    serializer_class   = ContractorInstallmentSerializer

    def get_queryset(self):
        qs = ContractorInstallment.objects.prefetch_related(
            "fin_payments__bank_account",
            "fin_payments__expense_account",
        ).select_related("contract")
        contract = self.request.query_params.get("contract")
        project  = self.request.query_params.get("project")
        if contract:
            qs = qs.filter(contract_id=contract)
        if project:
            qs = qs.filter(contract__project_id=project)
        return qs

    # ── ADD PAYMENT ───────────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="add_payment")
    @transaction.atomic
    def add_payment(self, request, pk=None):
        """
        Add one payment tranche to an installment (supports partial amounts).

        POST /fin/contractor-installments/{id}/add_payment/
        {
          "bank_account":    "<uuid>",
          "expense_account": "<uuid>",   // optional
          "amount":          150000.00,  // can be less than installment.remaining
          "date":            "2025-05-09",
          "reference":       "TXN-001",
          "notes":           "..."
        }
        """
        installment = self.get_object()

        if installment.status == ContractorInstallment.Status.PAID:
            return Response(
                {"detail": "This installment is already fully paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ser = AddPaymentSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        amount = Decimal(str(data["amount"]))
        if amount <= 0:
            return Response(
                {"detail": "Payment amount must be greater than zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Don't allow over-payment
        remaining = installment.remaining
        if amount > remaining:
            return Response(
                {"detail": f"Amount exceeds remaining balance (NPR {remaining:,.2f})."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve bank account
        try:
            bank_acc = Account.objects.get(id=data["bank_account"], is_bank=True)
        except Account.DoesNotExist:
            return Response(
                {"detail": "Bank account not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Resolve or auto-create expense account
        expense_acc = None
        if data.get("expense_account"):
            try:
                expense_acc = Account.objects.get(id=data["expense_account"])
            except Account.DoesNotExist:
                pass

        if not expense_acc:
            expense_acc = LedgerService.get_or_create_system_account(
                name="Construction Expense",
                code="5901",
                account_type="EXPENSE",
                project_id=installment.contract.project_id,
            )

        # Post double-entry journal: DR Construction Expense / CR Bank
        je = LedgerService.post_entry(
            date=data["date"],
            description=(
                f"Contractor Payment — {installment.contract.contractor_name} "
                f"— {installment.milestone}"
            ),
            lines=[
                {
                    "account_id": expense_acc.id,
                    "entry_type": EntryType.DEBIT,
                    "amount": amount,
                    "note": f"Milestone: {installment.milestone}",
                },
                {
                    "account_id": bank_acc.id,
                    "entry_type": EntryType.CREDIT,
                    "amount": amount,
                    "note": data.get("reference", ""),
                },
            ],
            source_type=SourceType.MANUAL,
            source_ref=data.get("reference", ""),
            project_id=installment.contract.project_id,
            user=request.user,
        )

        # Create the payment record
        InstallmentPayment.objects.create(
            installment=installment,
            bank_account=bank_acc,
            expense_account=expense_acc,
            amount=amount,
            date=data["date"],
            reference=data.get("reference", ""),
            notes=data.get("notes", ""),
            proof=data.get("proof"),
            journal_entry=je,
        )

        # Recompute installment status (PENDING → PARTIAL → PAID)
        installment.recompute_status()

        # Auto-complete contract if all installments are fully paid
        contract = installment.contract
        all_paid = not contract.fin_installments.exclude(
            status=ContractorInstallment.Status.PAID
        ).exists()
        if all_paid and contract.status != ContractorContract.Status.COMPLETED:
            contract.status = ContractorContract.Status.COMPLETED
            contract.save(update_fields=["status"])
        elif not all_paid and contract.status == ContractorContract.Status.COMPLETED:
            contract.status = ContractorContract.Status.ACTIVE
            contract.save(update_fields=["status"])

        installment.refresh_from_db()
        return Response(ContractorInstallmentSerializer(installment).data)

    # ── RESET ALL PAYMENTS ────────────────────────────────────────────────────

    @action(detail=True, methods=["post"], url_path="reset")
    @transaction.atomic
    def reset(self, request, pk=None):
        """
        Delete ALL payment tranches for an installment and revert it to PENDING.
        Also removes all associated journal entries.

        POST /fin/contractor-installments/{id}/reset/
        """
        installment = self.get_object()

        for payment in installment.fin_payments.select_related("journal_entry").all():
            if payment.journal_entry_id:
                je = payment.journal_entry
                payment.journal_entry = None
                payment.save(update_fields=["journal_entry"])
                je.fin_lines.all().delete()
                je.delete()
            payment.delete()

        installment.status = ContractorInstallment.Status.PENDING
        installment.save(update_fields=["status", "updated_at"])

        # Revert contract status if it was completed
        contract = installment.contract
        if contract.status == ContractorContract.Status.COMPLETED:
            contract.status = ContractorContract.Status.ACTIVE
            contract.save(update_fields=["status"])

        installment.refresh_from_db()
        return Response(ContractorInstallmentSerializer(installment).data)


class InstallmentPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List + retrieve + DELETE individual payment tranches.
    Deleting a tranche also removes its journal entry and recomputes installment status.
    """
    permission_classes = [IsAuthenticated]
    serializer_class   = InstallmentPaymentSerializer
    http_method_names  = ["get", "delete", "head", "options"]

    def get_queryset(self):
        qs = InstallmentPayment.objects.select_related(
            "installment__contract",
            "bank_account",
            "expense_account",
        )
        installment = self.request.query_params.get("installment")
        contract    = self.request.query_params.get("contract")
        project     = self.request.query_params.get("project")
        if installment:
            qs = qs.filter(installment_id=installment)
        if contract:
            qs = qs.filter(installment__contract_id=contract)
        if project:
            qs = qs.filter(installment__contract__project_id=project)
        return qs

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete one payment tranche, remove its journal entry, recompute installment status."""
        payment = self.get_object()
        installment = payment.installment
        contract    = installment.contract

        # Delete journal entry
        if payment.journal_entry_id:
            je = payment.journal_entry
            payment.journal_entry = None
            payment.save(update_fields=["journal_entry"])
            je.fin_lines.all().delete()
            je.delete()

        payment.delete()

        # Recompute status
        installment.recompute_status()

        # Revert contract to ACTIVE if it was completed but now isn't
        if contract.status == ContractorContract.Status.COMPLETED:
            contract.status = ContractorContract.Status.ACTIVE
            contract.save(update_fields=["status"])

        return Response(status=status.HTTP_204_NO_CONTENT)
