"""
Serializers for ContractorContract + ContractorInstallment + InstallmentPayment.
"""
from rest_framework import serializers
from ..models.contractor_payment import (
    ContractorContract, ContractorInstallment, InstallmentPayment
)


class InstallmentPaymentSerializer(serializers.ModelSerializer):
    bank_account_name    = serializers.CharField(source="bank_account.name",    read_only=True, default="")
    expense_account_name = serializers.CharField(source="expense_account.name", read_only=True, default="")

    class Meta:
        model  = InstallmentPayment
        fields = [
            "id", "installment",
            "bank_account", "bank_account_name",
            "expense_account", "expense_account_name",
            "amount", "date", "reference", "notes",
            "journal_entry", "proof",
            "created_at",
        ]
        read_only_fields = [
            "id", "journal_entry", "created_at",
            "bank_account_name", "expense_account_name",
        ]


class ContractorInstallmentSerializer(serializers.ModelSerializer):
    payments      = InstallmentPaymentSerializer(source="fin_payments", many=True, read_only=True)
    total_paid    = serializers.ReadOnlyField()
    remaining     = serializers.ReadOnlyField()
    payment_count = serializers.ReadOnlyField()
    last_paid_date = serializers.ReadOnlyField()

    class Meta:
        model  = ContractorInstallment
        fields = [
            "id", "contract", "order", "milestone",
            "amount", "percentage", "status",
            "due_date", "notes",
            "total_paid", "remaining", "payment_count", "last_paid_date",
            "payments",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "total_paid", "remaining", "payment_count", "last_paid_date",
            "payments",
        ]


class ContractorContractSerializer(serializers.ModelSerializer):
    installments       = ContractorInstallmentSerializer(source="fin_installments", many=True, read_only=True)
    total_paid         = serializers.ReadOnlyField()
    total_pending      = serializers.ReadOnlyField()
    paid_count         = serializers.ReadOnlyField()
    total_installments = serializers.ReadOnlyField()
    progress_pct       = serializers.ReadOnlyField()

    class Meta:
        model  = ContractorContract
        fields = [
            "id", "project", "contractor_name", "contract_number",
            "total_amount", "contract_date", "start_date", "end_date",
            "status", "notes", "document",
            "total_paid", "total_pending", "paid_count",
            "total_installments", "progress_pct",
            "installments",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "created_at", "updated_at",
            "total_paid", "total_pending", "paid_count",
            "total_installments", "progress_pct", "installments",
        ]


class AddPaymentSerializer(serializers.Serializer):
    """Payload to add a (possibly partial) payment tranche to an installment."""
    bank_account     = serializers.UUIDField()
    expense_account  = serializers.UUIDField(required=False, allow_null=True)
    amount           = serializers.DecimalField(max_digits=15, decimal_places=2)
    date             = serializers.DateField()
    reference        = serializers.CharField(required=False, allow_blank=True, default="")
    notes            = serializers.CharField(required=False, allow_blank=True, default="")
    proof            = serializers.FileField(required=False, allow_null=True)
