"""
Loan models — Disbursement and EMI Payment tracking.

LoanAccount lives in Account (is_loan=True, type=LIABILITY).
These models record individual transactions against that account.
"""
import uuid
from django.db import models


class LoanDisbursement(models.Model):
    """
    Bank disbursed money into your account.
    Journal: Debit receiving Bank / Credit Loan Account.
    """
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan_account = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_disbursements",
        limit_choices_to={"is_loan": True},
    )
    bank_account = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_disbursement_receipts",
        limit_choices_to={"is_bank": True},
        help_text="Bank account that received the loan money",
    )
    date          = models.DateField()
    amount        = models.DecimalField(max_digits=15, decimal_places=2)
    reference     = models.CharField(max_length=255, blank=True, default="")
    notes         = models.TextField(blank=True, default="")
    journal_entry = models.OneToOneField(
        "fin.JournalEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="fin_disbursement",
    )
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date"]

    def __str__(self):
        return f"Disbursement NPR {self.amount:,} for {self.loan_account.name} on {self.date}"


class LoanEMIPayment(models.Model):
    """
    Monthly EMI payment split into principal + interest portions.
    Journal:
      Debit  Loan Account      (principal — reduces liability)
      Debit  Interest Expense  (interest cost)
      Credit Bank Account      (total EMI out)
    """
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    loan_account    = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_emi_payments",
        limit_choices_to={"is_loan": True},
    )
    bank_account    = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_emi_sources",
        limit_choices_to={"is_bank": True},
        help_text="Bank account the EMI is paid from",
    )
    date              = models.DateField()
    total_emi         = models.DecimalField(max_digits=15, decimal_places=2)
    principal_amount  = models.DecimalField(max_digits=15, decimal_places=2)
    interest_amount   = models.DecimalField(max_digits=15, decimal_places=2)
    reference         = models.CharField(max_length=255, blank=True, default="")
    journal_entry     = models.OneToOneField(
        "fin.JournalEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="fin_emi_payment",
    )
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date"]

    def __str__(self):
        return f"EMI NPR {self.total_emi:,} for {self.loan_account.name} on {self.date}"
