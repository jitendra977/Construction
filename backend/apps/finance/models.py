"""
Finance domain models.

Two-tier architecture:
  1. GL layer: Account + JournalEntry + JournalLine -> source of truth for balances
  2. Subledger: Bill, BillPayment, BankTransfer, Expense, Payment, FundingSource,
     PurchaseOrder, BudgetCategory, PhaseBudgetAllocation
     Each subledger document can post to the GL via services.FinanceService.

Business logic lives in services.py, NOT in model.save() methods, so the same
flow can be invoked from signals, management commands, or tests.
"""

from decimal import Decimal
from django.db import models
from django.db.models import Sum, Q

from apps.core.models import ConstructionPhase
from apps.resources.models import Document
from simple_history.models import HistoricalRecords


ZERO = Decimal("0.00")


# -----------------------------------------------------------------------------
# GL: Chart of Accounts + Journal
# -----------------------------------------------------------------------------

class Account(models.Model):
    """Chart-of-accounts node."""

    ACCOUNT_TYPE_CHOICES = [
        ("ASSET", "Asset (Bank, Cash, Inventory)"),
        ("LIABILITY", "Liability (Accounts Payable, Loans)"),
        ("EQUITY", "Equity (Owner Capital, Retained Earnings)"),
        ("REVENUE", "Revenue (Client Invoices, Income)"),
        ("EXPENSE", "Expense (COGS, Materials, Labor, Overheads)"),
    ]

    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="sub_accounts"
    )
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} — {self.name}"

    # ---- computed balances -------------------------------------------------

    @property
    def balance(self):
        """Signed balance using the accounting convention for the type."""
        agg = self.journal_lines.aggregate(
            debit=Sum("amount", filter=Q(entry_type="DEBIT")),
            credit=Sum("amount", filter=Q(entry_type="CREDIT")),
        )
        debit = agg["debit"] or ZERO
        credit = agg["credit"] or ZERO
        if self.account_type in ("ASSET", "EXPENSE"):
            return debit - credit
        return credit - debit

    # ---- helpers used by services -----------------------------------------

    @classmethod
    def get_or_bootstrap(cls, *, code, name, account_type):
        """Fetch an account by code, creating a minimal stub if it doesn't exist.

        Safer than raising in the middle of a business transaction.
        """
        acc, _ = cls.objects.get_or_create(
            code=code,
            defaults={"name": name, "account_type": account_type},
        )
        return acc

    @classmethod
    def default_ap(cls):
        return cls.get_or_bootstrap(code="2000", name="Accounts Payable", account_type="LIABILITY")

    @classmethod
    def default_expense(cls):
        return cls.get_or_bootstrap(code="5000", name="Project Expenses", account_type="EXPENSE")

    @classmethod
    def default_equity(cls):
        return cls.get_or_bootstrap(code="3000", name="Owner Capital", account_type="EQUITY")

    @classmethod
    def default_cash(cls):
        return cls.get_or_bootstrap(code="1010", name="Cash on Hand", account_type="ASSET")


class JournalEntry(models.Model):
    """One ledger transaction. Sum of debit lines must equal sum of credit lines."""

    ENTRY_SOURCE_CHOICES = [
        ("BILL", "Vendor Bill"),
        ("PAYMENT", "Bill Payment"),
        ("INVOICE", "Client Invoice"),
        ("RECEIPT", "Payment Received"),
        ("MANUAL", "Manual Journal Entry"),
        ("INITIAL", "Opening Balance"),
        ("TRANSFER", "Bank Transfer"),
        ("EXPENSE", "Direct Expense"),
        ("FUNDING", "Funding Received"),
    ]

    date = models.DateField()
    description = models.CharField(max_length=255)
    source = models.CharField(max_length=20, choices=ENTRY_SOURCE_CHOICES, default="MANUAL")
    reference_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"JE-{self.id} {self.date} {self.description[:40]}"

    @property
    def total_debit(self):
        return self.lines.filter(entry_type="DEBIT").aggregate(t=Sum("amount"))["t"] or ZERO

    @property
    def total_credit(self):
        return self.lines.filter(entry_type="CREDIT").aggregate(t=Sum("amount"))["t"] or ZERO

    @property
    def is_balanced(self):
        return self.total_debit == self.total_credit


class JournalLine(models.Model):
    ENTRY_TYPE_CHOICES = [("DEBIT", "Debit"), ("CREDIT", "Credit")]

    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_lines")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    entry_type = models.CharField(max_length=10, choices=ENTRY_TYPE_CHOICES)
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.entry_type} Rs.{self.amount} — {self.account.name}"


# -----------------------------------------------------------------------------
# Budget planning
# -----------------------------------------------------------------------------

class BudgetCategory(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    allocation = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)
    associated_account = models.ForeignKey(
        Account, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="budget_categories",
    )

    class Meta:
        verbose_name_plural = "Budget Categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    # Unified spent-across-all-subledgers — includes both direct expenses
    # and billed line items.
    @property
    def total_spent(self):
        exp = (
            self.expenses.filter(is_inventory_usage=False)
            .aggregate(t=Sum("amount"))["t"]
            or ZERO
        )
        billed = self.bill_items.aggregate(t=Sum("amount"))["t"] or ZERO
        return exp + billed

    @property
    def remaining_budget(self):
        return (self.allocation or ZERO) - self.total_spent


class PhaseBudgetAllocation(models.Model):
    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name="phase_allocations")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.CASCADE, related_name="category_allocations")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("category", "phase")
        verbose_name = "Phase Budget Allocation"
        verbose_name_plural = "Phase Budget Allocations"

    def __str__(self):
        return f"{self.category.name} -> {self.phase.name}: Rs.{self.amount}"


# -----------------------------------------------------------------------------
# Funding — owner-facing view of "where did the money come from"
# -----------------------------------------------------------------------------

class FundingSource(models.Model):
    SOURCE_TYPE_CHOICES = [
        ("OWN_MONEY", "Personal Savings / Own Money (Nagad/Bachat)"),
        ("LOAN", "Bank Loan (Karja)"),
        ("BORROWED", "Borrowed from Friends/Family (Saapathi)"),
        ("OTHER", "Other Source"),
    ]
    PAYMENT_METHOD_CHOICES = [
        ("CASH", "Cash (Nagad)"),
        ("BANK_TRANSFER", "Bank Transfer (ConnectIPS)"),
        ("CHECK", "Cheque"),
        ("UPI", "QR / Mobile Banking"),
        ("OTHER", "Other"),
    ]

    name = models.CharField(max_length=200)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default="OWN_MONEY")
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total allocated capital")
    default_payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default="CASH")
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=ZERO)
    received_date = models.DateField()
    notes = models.TextField(blank=True)
    
    # Convenience denormalized balance (for list pages). Kept in sync by services.
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)

    associated_account = models.ForeignKey(
        "Account", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="funding_sources",
        help_text="The GL Asset account where this money is held"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} (Rs.{self.current_balance})"

    # ---- derived values (always trust transactions as source of truth) ----

    @property
    def total_credited(self):
        return self.transactions.filter(transaction_type="CREDIT").aggregate(t=Sum("amount"))["t"] or ZERO

    @property
    def total_debited(self):
        return self.transactions.filter(transaction_type="DEBIT").aggregate(t=Sum("amount"))["t"] or ZERO

    @property
    def true_balance(self):
        return self.total_credited - self.total_debited


class FundingTransaction(models.Model):
    TRANSACTION_TYPE_CHOICES = [("CREDIT", "Credit"), ("DEBIT", "Debit")]

    funding_source = models.ForeignKey(FundingSource, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    date = models.DateField()
    description = models.CharField(max_length=255)
    payment = models.ForeignKey("Payment", on_delete=models.CASCADE, null=True, blank=True, related_name="funding_transactions")
    journal_entry = models.OneToOneField("JournalEntry", on_delete=models.SET_NULL, null=True, blank=True, related_name="funding_transaction_source")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.transaction_type} Rs.{self.amount} — {self.description}"


# -----------------------------------------------------------------------------
# Accounts Payable — Bills
# -----------------------------------------------------------------------------

class PurchaseOrder(models.Model):
    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("APPROVED", "Approved"),
        ("RECEIVED", "Partially/Fully Received"),
        ("CLOSED", "Closed/Billed"),
        ("CANCELLED", "Cancelled"),
    ]

    po_number = models.CharField(max_length=50, unique=True)
    date = models.DateField()
    supplier = models.ForeignKey("resources.Supplier", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    contractor = models.ForeignKey("resources.Contractor", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchase_orders")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.SET_NULL, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"PO {self.po_number} — Rs.{self.total_amount}"


class Bill(models.Model):
    STATUS_CHOICES = [
        ("UNPAID", "Unpaid"),
        ("PARTIAL", "Partially Paid"),
        ("PAID", "Fully Paid"),
    ]

    bill_number = models.CharField(max_length=50, blank=True)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name="bills")
    supplier = models.ForeignKey("resources.Supplier", on_delete=models.SET_NULL, null=True, blank=True, related_name="bills")
    contractor = models.ForeignKey("resources.Contractor", on_delete=models.SET_NULL, null=True, blank=True, related_name="bills")
    date_issued = models.DateField()
    due_date = models.DateField()
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="UNPAID")
    journal_entry = models.OneToOneField(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_source")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_issued", "-id"]

    def __str__(self):
        who = self.supplier or self.contractor or "Vendor"
        return f"Bill {self.bill_number or self.id} — {who} — Rs.{self.total_amount}"

    @property
    def balance_due(self):
        return (self.total_amount or ZERO) - (self.amount_paid or ZERO)

    def recompute_status(self):
        """Derive status from amount_paid vs total_amount; caller must .save()."""
        if self.amount_paid >= self.total_amount and self.total_amount > 0:
            self.status = "PAID"
        elif self.amount_paid > 0:
            self.status = "PARTIAL"
        else:
            self.status = "UNPAID"
        return self.status


class BillItem(models.Model):
    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey("BudgetCategory", on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_items")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_items")
    material = models.ForeignKey("resources.Material", on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_items")
    description = models.CharField(max_length=255)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1"))
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=ZERO)
    account = models.ForeignKey(Account, on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_items")

    def save(self, *args, **kwargs):
        # Keep amount = qty * unit_price for consistent reporting
        if self.quantity is not None and self.unit_price is not None:
            self.amount = (self.quantity or ZERO) * (self.unit_price or ZERO)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.description} — Rs.{self.amount}"


class BillPayment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("CASH", "Cash"),
        ("BANK_TRANSFER", "Bank Transfer"),
        ("CHECK", "Cheque"),
        ("OTHER", "Other"),
    ]

    bill = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="payments")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="bill_payments_made")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True)
    journal_entry = models.OneToOneField(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="bill_payment_source")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Payment Rs.{self.amount} — Bill #{self.bill_id}"


# -----------------------------------------------------------------------------
# Treasury — moving money between asset accounts
# -----------------------------------------------------------------------------

class BankTransfer(models.Model):
    from_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="transfers_out")
    to_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="transfers_in")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    reference_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    journal_entry = models.OneToOneField(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True, related_name="bank_transfer_source")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Transfer Rs.{self.amount}: {self.from_account.name} -> {self.to_account.name}"


# -----------------------------------------------------------------------------
# Legacy simple spend tracking — kept for backwards compatibility
# -----------------------------------------------------------------------------

class Expense(models.Model):
    """Single-entry "I spent X" record. Simpler than Bill, for small cash outflows."""

    EXPENSE_TYPE_CHOICES = [
        ("MATERIAL", "Material Purchase"),
        ("LABOR", "Labor/Worker Payment"),
        ("FEES", "Professional Fees"),
        ("GOVT", "Government/Permit Fees"),
        ("OTHER", "Other Miscellaneous"),
    ]

    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES, default="MATERIAL")
    category = models.ForeignKey(BudgetCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")

    material = models.ForeignKey("resources.Material", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    supplier = models.ForeignKey("resources.Supplier", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    contractor = models.ForeignKey("resources.Contractor", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    funding_source = models.ForeignKey(FundingSource, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    task = models.ForeignKey("tasks.Task", on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")

    date = models.DateField()
    paid_to = models.CharField(max_length=200)
    is_paid = models.BooleanField(default=False)
    receipt = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name="expenses")
    notes = models.TextField(blank=True)
    is_inventory_usage = models.BooleanField(
        default=False,
        help_text="Internal cost allocation — excluded from cashflow to avoid double counting.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"{self.title} — Rs.{self.amount} ({self.status})"

    @property
    def total_paid(self):
        return self.payments.aggregate(t=Sum("amount"))["t"] or ZERO

    @property
    def balance_due(self):
        return (self.amount or ZERO) - self.total_paid

    @property
    def status(self):
        paid = self.total_paid
        if paid >= self.amount and self.amount > 0:
            return "PAID"
        if paid > 0:
            return "PARTIAL"
        return "UNPAID"

    def save(self, *args, **kwargs):
        # Inherit category/phase from linked task if not set
        if self.task:
            if not self.category and getattr(self.task, "category", None):
                self.category = self.task.category
            if not self.phase and getattr(self.task, "phase", None):
                self.phase = self.task.phase
        super().save(*args, **kwargs)


class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = [
        ("CASH", "Nagad (Cash)"),
        ("BANK_TRANSFER", "Bank / ConnectIPS"),
        ("QR", "eSewa/Khalti/Fonepay"),
        ("CHECK", "Cheque"),
        ("OTHER", "Other"),
    ]

    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name="payments")
    funding_source = models.ForeignKey(FundingSource, on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    proof_photo = models.ImageField(upload_to="payments/proofs/", null=True, blank=True)
    history = HistoricalRecords()

    class Meta:
        ordering = ["-date", "-id"]

    def __str__(self):
        return f"Payment Rs.{self.amount} — {self.expense.title}"
