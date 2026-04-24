"""
Account — General Ledger Chart of Accounts
Every financial transaction posts to at least two accounts (double-entry).
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Q


ZERO = Decimal("0.00")


class AccountType(models.TextChoices):
    ASSET     = "ASSET",     "Asset"       # Bank, Cash, Receivables
    LIABILITY = "LIABILITY", "Liability"   # Loans, Payables
    EQUITY    = "EQUITY",    "Equity"      # Owner capital
    REVENUE   = "REVENUE",   "Revenue"     # Income
    EXPENSE   = "EXPENSE",   "Expense"     # Costs


class Account(models.Model):
    """
    A single row in the Chart of Accounts.

    Rules
    -----
    - ASSET / EXPENSE accounts: balance = total_debits - total_credits
    - LIABILITY / EQUITY / REVENUE: balance = total_credits - total_debits
    - is_bank=True  → shown in Banking section
    - is_loan=True  → shown in Loans section (must be LIABILITY type)
    """

    id   = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True, help_text="e.g. 1010, 2100")
    name = models.CharField(max_length=255)
    account_type = models.CharField(max_length=20, choices=AccountType.choices)
    description  = models.TextField(blank=True, default="")

    # ── Scope ────────────────────────────────────────────────────────────────
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="fin_accounts",
        help_text="Leave blank for global / shared accounts",
    )

    # ── Banking metadata ─────────────────────────────────────────────────────
    is_bank             = models.BooleanField(default=False)
    bank_name           = models.CharField(max_length=100, blank=True, default="")
    account_number      = models.CharField(max_length=100, blank=True, default="")
    account_holder_name = models.CharField(max_length=255, blank=True, default="")

    # ── Loan metadata (only when is_loan=True) ───────────────────────────────
    is_loan             = models.BooleanField(default=False)
    total_loan_limit    = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    interest_rate       = models.DecimalField(max_digits=5,  decimal_places=2, null=True, blank=True, help_text="Annual %")
    loan_tenure_months  = models.IntegerField(null=True, blank=True)
    emi_amount          = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "fin"
        ordering  = ["code"]
        verbose_name = "Account"
        verbose_name_plural = "Accounts"

    def __str__(self):
        return f"{self.code} – {self.name}"

    # ── Computed balance ─────────────────────────────────────────────────────
    @property
    def balance(self) -> Decimal:
        """
        Calculates live balance from journal lines.
        Calls no external services — pure DB aggregation.
        """
        agg = self.fin_journal_lines.aggregate(
            debit=Sum("amount", filter=Q(entry_type="DEBIT")),
            credit=Sum("amount", filter=Q(entry_type="CREDIT")),
        )
        debit  = agg["debit"]  or ZERO
        credit = agg["credit"] or ZERO

        if self.account_type in (AccountType.ASSET, AccountType.EXPENSE):
            return debit - credit
        return credit - debit
