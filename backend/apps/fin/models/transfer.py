"""
CashTransfer — move money between two bank/cash accounts.
Creates a JournalEntry automatically via TreasuryService.
"""
import uuid
from django.db import models


class CashTransfer(models.Model):
    """
    Example: Move NPR 50,000 from Nabil Bank → Petty Cash.
    Journal: Debit Petty Cash / Credit Nabil Bank.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date         = models.DateField()
    from_account = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_transfers_out",
        help_text="Account money leaves (will be CREDITED)",
    )
    to_account   = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_transfers_in",
        help_text="Account money enters (will be DEBITED)",
    )
    amount        = models.DecimalField(max_digits=15, decimal_places=2)
    reference     = models.CharField(max_length=255, blank=True, default="", help_text="Cheque / transaction number")
    notes         = models.TextField(blank=True, default="")
    journal_entry = models.OneToOneField(
        "fin.JournalEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="fin_transfer",
    )
    project      = models.ForeignKey(
        "core.HouseProject", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_cash_transfers",
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date", "-created_at"]

    def __str__(self):
        return f"Transfer NPR {self.amount:,} | {self.from_account.name} → {self.to_account.name} on {self.date}"
