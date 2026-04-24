"""
JournalEntry + JournalLine — the core of double-entry bookkeeping.

Every financial event (deposit, payment, transfer, EMI) creates exactly
one JournalEntry with two or more balanced JournalLines.
Total debits MUST equal total credits or the entry is rejected.
"""
import uuid
from django.db import models
from django.conf import settings


class EntryType(models.TextChoices):
    DEBIT  = "DEBIT",  "Debit"
    CREDIT = "CREDIT", "Credit"


class SourceType(models.TextChoices):
    MANUAL    = "MANUAL",    "Manual Entry"
    DEPOSIT   = "DEPOSIT",   "Bank Deposit"
    TRANSFER  = "TRANSFER",  "Cash Transfer"
    LOAN_IN   = "LOAN_IN",   "Loan Disbursement"
    EMI       = "EMI",       "EMI Payment"
    BILL      = "BILL",      "Bill Created"
    PAYMENT   = "PAYMENT",   "Bill Payment"
    OPENING   = "OPENING",   "Opening Balance"


class JournalEntry(models.Model):
    """
    A balanced financial event.
    One entry = many lines, debits == credits.
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date            = models.DateField()
    description     = models.CharField(max_length=500)
    source_type     = models.CharField(max_length=20, choices=SourceType.choices, default=SourceType.MANUAL)
    source_ref      = models.CharField(max_length=100, blank=True, default="", help_text="e.g. BILL-001, TX-003")
    project         = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="fin_journal_entries",
    )
    created_by      = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="fin_journal_entries",
    )
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date", "-created_at"]
        verbose_name = "Journal Entry"
        verbose_name_plural = "Journal Entries"

    def __str__(self):
        return f"JE/{self.date} – {self.description[:60]}"

    @property
    def is_balanced(self):
        from decimal import Decimal
        from django.db.models import Sum, Q
        agg = self.fin_lines.aggregate(
            d=Sum("amount", filter=Q(entry_type="DEBIT")),
            c=Sum("amount", filter=Q(entry_type="CREDIT")),
        )
        return (agg["d"] or Decimal("0")) == (agg["c"] or Decimal("0"))


class JournalLine(models.Model):
    """
    One side of a journal entry (either debit or credit).
    """
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name="fin_lines")
    account       = models.ForeignKey("fin.Account", on_delete=models.PROTECT, related_name="fin_journal_lines")
    entry_type    = models.CharField(max_length=10, choices=EntryType.choices)
    amount        = models.DecimalField(max_digits=15, decimal_places=2)
    note          = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        app_label = "fin"
        ordering  = ["journal_entry", "entry_type"]

    def __str__(self):
        return f"{self.entry_type} {self.amount} → {self.account.name}"
