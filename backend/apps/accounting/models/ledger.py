import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Q
from django.conf import settings

ZERO = Decimal("0.00")

class AccountType(models.TextChoices):
    ASSET = "ASSET", "Asset"
    LIABILITY = "LIABILITY", "Liability"
    EQUITY = "EQUITY", "Equity"
    REVENUE = "REVENUE", "Revenue"
    EXPENSE = "EXPENSE", "Expense"

class Account(models.Model):
    """
    General Ledger Account.
    The foundational bucket for double-entry accounting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    project = models.ForeignKey(
        'core.HouseProject', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='gl_accounts'
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=100, blank=True, null=True)
    account_holder_name = models.CharField(max_length=255, blank=True, null=True)
    is_bank = models.BooleanField(default=False, help_text="If true, this account will appear in Treasury/Bank views")
    is_loan = models.BooleanField(default=False, help_text="If true, this account will appear in Loan/Liability views")
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Annual interest rate for loans")
    loan_tenure_months = models.IntegerField(null=True, blank=True, help_text="Total duration of loan in months")
    emi_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Monthly EMI amount")
    total_loan_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True, help_text="Total approved loan amount (Credit Limit)")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["code"]

    def __str__(self):
        return f"{self.code} - {self.name}"

    @property
    def balance(self):
        """
        Calculates balance strictly from JournalLines.
        Assets/Expenses increase with Debits.
        Liabilities/Equity/Revenue increase with Credits.
        """
        agg = self.journal_lines.aggregate(
            debit=Sum("amount", filter=Q(entry_type="DEBIT")),
            credit=Sum("amount", filter=Q(entry_type="CREDIT")),
        )
        debit = agg["debit"] or ZERO
        credit = agg["credit"] or ZERO
        if self.account_type in (AccountType.ASSET, AccountType.EXPENSE):
            return debit - credit
        return credit - debit

class JournalEntry(models.Model):
    """
    A balanced entry representing a financial event.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    description = models.CharField(max_length=500)
    source_document = models.CharField(max_length=100, blank=True, null=True, help_text="e.g. Bill-102, Transfer-5")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name_plural = "Journal Entries"
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"JE-{self.id} on {self.date}"

class EntryType(models.TextChoices):
    DEBIT = "DEBIT", "Debit"
    CREDIT = "CREDIT", "Credit"

class JournalLine(models.Model):
    """
    A single line of a JournalEntry.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="lines")
    account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="journal_lines")
    entry_type = models.CharField(max_length=10, choices=EntryType.choices)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Optional linking to project management layers
    project = models.ForeignKey('core.HouseProject', on_delete=models.SET_NULL, null=True, blank=True)
    phase = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        ordering = ["journal_entry", "entry_type"]

    def __str__(self):
        return f"{self.entry_type} {self.amount} to {self.account.name}"
