import uuid
from django.db import models
from django.conf import settings
from .ledger import Account

class BankAccount(models.Model):
    """
    Physical Bank Account / Cash Drawer.
    Linked 1:1 to an ASSET account in the GL.
    Scoped to a project if project is set.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='bank_accounts'
    )
    name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=100, blank=True, null=True)
    gl_account = models.OneToOneField(Account, on_delete=models.PROTECT, related_name="bank_account")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class CapitalSourceType(models.TextChoices):
    SAVINGS = "SAVINGS", "Personal Savings"
    LOAN = "LOAN", "Bank Loan"
    INVESTMENT = "INVESTMENT", "Investment"
    REVENUE = "REVENUE", "Project Revenue"
    OTHER = "OTHER", "Other"

class CapitalSource(models.Model):
    """
    Replaces the old 'FundingSource'.
    Represents where the money came from. Often linked to an EQUITY or LIABILITY GL Account.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=50, choices=CapitalSourceType.choices)
    gl_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="capital_sources")
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class CashTransfer(models.Model):
    """
    Moving cash between bank accounts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField()
    from_bank = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name="transfers_out")
    to_bank = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name="transfers_in")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reference = models.CharField(max_length=255, blank=True, null=True)
    journal_entry = models.OneToOneField('accounting.JournalEntry', on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Transfer {self.amount} from {self.from_bank} to {self.to_bank}"
