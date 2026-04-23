"""
Finance serializers — flat, read-heavy, and consistent about field names.

Rules:
  - Every FK has a matching `<name>_name` read-only for UI display.
  - Computed totals (balance, balance_due, total_spent, etc.) are exposed
    explicitly as SerializerMethodField or read-only DecimalField — never
    inferred by the serializer introspection.
  - Write paths prefer the service layer (views call FinanceService /
    BillService), so serializers here stay close to "pure data".
"""

from decimal import Decimal
from rest_framework import serializers

from .models import (
    Account,
    JournalEntry,
    JournalLine,
    BudgetCategory,
    PhaseBudgetAllocation,
    FundingSource,
    FundingTransaction,
    PurchaseOrder,
    Bill,
    BillItem,
    BillPayment,
    BankTransfer,
    Expense,
    Payment,
)


def _as_float(dec):
    if dec is None:
        return 0.0
    return float(dec)


# -----------------------------------------------------------------------------
# GL
# -----------------------------------------------------------------------------

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.SerializerMethodField()
    # Also expose as `current_balance` because legacy frontend code uses that name.
    current_balance = serializers.SerializerMethodField()
    initial_balance = serializers.DecimalField(
        max_digits=12, decimal_places=2, write_only=True, required=False, allow_null=True
    )

    linked_funding_source_name = serializers.SerializerMethodField()
    linked_funding_source_balance = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = [
            "id", "name", "code", "account_type", "parent",
            "description", "is_active",
            "balance", "current_balance", "initial_balance",
            "linked_funding_source_name", "linked_funding_source_balance",
            "created_at", "updated_at",
        ]

    def get_linked_funding_source_name(self, obj):
        # Return the name of the first linked funding source, if any
        fs = obj.funding_sources.first()
        return fs.name if fs else None

    def get_linked_funding_source_balance(self, obj):
        fs = obj.funding_sources.first()
        return _as_float(fs.current_balance) if fs else None

    def get_balance(self, obj):
        return _as_float(obj.balance)

    def get_current_balance(self, obj):
        return _as_float(obj.balance)

    def create(self, validated_data):
        initial = validated_data.pop("initial_balance", None)
        account = super().create(validated_data)
        if initial:
            from .services import FinanceService
            FinanceService.post_opening_balance(account, initial)
        return account


class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_code = serializers.CharField(source="account.code", read_only=True)
    account_type = serializers.CharField(source="account.account_type", read_only=True)

    class Meta:
        model = JournalLine
        fields = [
            "id", "journal_entry", "account", "account_name", "account_code", "account_type",
            "amount", "entry_type", "description",
        ]


class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, required=False)
    total_debit = serializers.SerializerMethodField()
    total_credit = serializers.SerializerMethodField()
    is_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = JournalEntry
        fields = [
            "id", "date", "description", "source", "reference_id",
            "lines", "total_debit", "total_credit", "is_balanced", "created_at",
        ]

    def get_total_debit(self, obj):
        return _as_float(obj.total_debit)

    def get_total_credit(self, obj):
        return _as_float(obj.total_credit)

    def create(self, validated_data):
        from .services import LedgerService
        lines_data = validated_data.pop("lines", [])
        return LedgerService.post(
            date=validated_data["date"],
            description=validated_data["description"],
            source=validated_data.get("source", "MANUAL"),
            reference_id=validated_data.get("reference_id", ""),
            lines=lines_data,
        )


# -----------------------------------------------------------------------------
# Budget
# -----------------------------------------------------------------------------

class PhaseBudgetAllocationSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source="phase.name", read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = PhaseBudgetAllocation
        fields = "__all__"


class BudgetCategorySerializer(serializers.ModelSerializer):
    total_spent = serializers.SerializerMethodField()
    remaining_budget = serializers.SerializerMethodField()
    phase_allocations = PhaseBudgetAllocationSerializer(many=True, read_only=True)
    associated_account_name = serializers.CharField(source="associated_account.name", read_only=True)

    class Meta:
        model = BudgetCategory
        fields = [
            "id", "name", "description", "allocation", "associated_account",
            "associated_account_name", "total_spent", "remaining_budget",
            "phase_allocations",
        ]

    def get_total_spent(self, obj):
        return _as_float(obj.total_spent)

    def get_remaining_budget(self, obj):
        return _as_float(obj.remaining_budget)


# -----------------------------------------------------------------------------
# Funding
# -----------------------------------------------------------------------------

class FundingTransactionSerializer(serializers.ModelSerializer):
    funding_source_name = serializers.CharField(source="funding_source.name", read_only=True)
    expense_id = serializers.IntegerField(source="payment.expense_id", read_only=True)

    class Meta:
        model = FundingTransaction
        fields = "__all__"


class FundingSourceSerializer(serializers.ModelSerializer):
    transactions = FundingTransactionSerializer(many=True, read_only=True)
    total_credited = serializers.SerializerMethodField()
    total_debited = serializers.SerializerMethodField()

    associated_account_name = serializers.CharField(source="associated_account.name", read_only=True)
    associated_account_balance = serializers.DecimalField(
        source="associated_account.balance", max_digits=12, decimal_places=2, read_only=True
    )

    class Meta:
        model = FundingSource
        fields = [
            "id", "name", "source_type", "amount", "default_payment_method",
            "interest_rate", "received_date", "notes", "current_balance",
            "associated_account", "associated_account_name", "associated_account_balance",
            "total_credited", "total_debited", "transactions",
            "created_at", "updated_at",
        ]
        read_only_fields = ["current_balance"]

    def get_total_credited(self, obj):
        return _as_float(obj.total_credited)

    def get_total_debited(self, obj):
        return _as_float(obj.total_debited)


# -----------------------------------------------------------------------------
# Accounts Payable
# -----------------------------------------------------------------------------

class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    contractor_name = serializers.CharField(source="contractor.name", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = "__all__"


class BillItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    phase_name = serializers.CharField(source="phase.name", read_only=True)
    material_name = serializers.CharField(source="material.name", read_only=True)

    class Meta:
        model = BillItem
        fields = "__all__"


class BillPaymentSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source="account.name", read_only=True)
    account_code = serializers.CharField(source="account.code", read_only=True)

    class Meta:
        model = BillPayment
        fields = [
            "id", "bill", "account", "account_name", "account_code",
            "amount", "date", "method", "reference_id",
            "journal_entry", "created_at",
        ]
        read_only_fields = ["journal_entry"]


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    payments = BillPaymentSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    contractor_name = serializers.CharField(source="contractor.name", read_only=True)
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Bill
        fields = [
            "id", "bill_number", "purchase_order",
            "supplier", "supplier_name", "contractor", "contractor_name",
            "date_issued", "due_date",
            "total_amount", "amount_paid", "balance_due", "status",
            "journal_entry", "notes",
            "items", "payments",
            "created_at",
        ]
        read_only_fields = ["amount_paid", "status", "journal_entry"]

    def get_balance_due(self, obj):
        return _as_float(obj.balance_due)


class BankTransferSerializer(serializers.ModelSerializer):
    from_account_name = serializers.CharField(source="from_account.name", read_only=True)
    to_account_name = serializers.CharField(source="to_account.name", read_only=True)
    from_account_code = serializers.CharField(source="from_account.code", read_only=True)
    to_account_code = serializers.CharField(source="to_account.code", read_only=True)

    class Meta:
        model = BankTransfer
        fields = "__all__"
        read_only_fields = ["journal_entry"]


# -----------------------------------------------------------------------------
# Expenses / Payments (legacy direct-spend flow)
# -----------------------------------------------------------------------------

class PaymentSerializer(serializers.ModelSerializer):
    send_receipt = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Payment
        fields = [
            "id", "expense", "funding_source", "amount", "date", "method",
            "reference_id", "notes", "proof_photo", "send_receipt",
        ]


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    phase_name = serializers.CharField(source="phase.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    contractor_name = serializers.CharField(source="contractor.name", read_only=True)
    contractor_photo = serializers.ImageField(source="contractor.photo", read_only=True)
    supplier_photo = serializers.ImageField(source="supplier.photo", read_only=True)
    funding_source_name = serializers.CharField(source="funding_source.name", read_only=True)
    task_name = serializers.CharField(source="task.title", read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    total_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()
    status = serializers.CharField(read_only=True)
    material_transaction = serializers.SerializerMethodField()

    class Meta:
        model = Expense
        fields = "__all__"

    def get_total_paid(self, obj):
        return _as_float(obj.total_paid)

    def get_balance_due(self, obj):
        return _as_float(obj.balance_due)

    def get_material_transaction(self, obj):
        trans = getattr(obj, "material_transactions", None)
        if trans is None:
            return None
        first = trans.first()
        return first.id if first else None
