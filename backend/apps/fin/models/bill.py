"""
Bill & BillPayment — Accounts Payable workflow.

Flow:
  1. Create Bill (vendor owes you nothing; you owe vendor)
  2. Create BillPayment against that Bill (reduces outstanding)
  3. Each payment posts a JournalEntry automatically.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum


class Bill(models.Model):
    """Vendor invoice received."""

    class Status(models.TextChoices):
        UNPAID  = "UNPAID",  "Unpaid"
        PARTIAL = "PARTIAL", "Partially Paid"
        PAID    = "PAID",    "Fully Paid"

    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_name    = models.CharField(max_length=255, help_text="Supplier or contractor name")
    invoice_number = models.CharField(max_length=100, blank=True, default="")
    date           = models.DateField()
    due_date       = models.DateField(null=True, blank=True)
    description    = models.CharField(max_length=500)
    total_amount   = models.DecimalField(max_digits=15, decimal_places=2)

    # GL account to charge the expense against
    expense_account = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_bills",
        limit_choices_to={"account_type": "EXPENSE"},
    )
    # Liability account (Accounts Payable)
    payable_account = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_payable_bills",
        limit_choices_to={"account_type": "LIABILITY"},
    )
    project        = models.ForeignKey(
        "core.HouseProject", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_bills",
    )
    notes          = models.TextField(blank=True, default="")
    journal_entry  = models.OneToOneField(
        "fin.JournalEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="fin_bill",
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date"]

    def __str__(self):
        return f"Bill/{self.invoice_number or self.id} – {self.vendor_name} – NPR {self.total_amount:,}"

    @property
    def paid_amount(self) -> Decimal:
        agg = self.fin_payments.aggregate(total=Sum("amount"))
        return agg["total"] or Decimal("0.00")

    @property
    def outstanding(self) -> Decimal:
        return max(self.total_amount - self.paid_amount, Decimal("0.00"))

    @property
    def payment_status(self) -> str:
        paid = self.paid_amount
        if paid <= 0:
            return self.Status.UNPAID
        if paid >= self.total_amount:
            return self.Status.PAID
        return self.Status.PARTIAL

    @property
    def is_overdue(self) -> bool:
        from django.utils import timezone
        if self.due_date and self.payment_status != self.Status.PAID:
            return self.due_date < timezone.now().date()
        return False


class BillItem(models.Model):
    """Optional line-item breakdown for a Bill."""
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill        = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="fin_items")
    description = models.CharField(max_length=255)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price  = models.DecimalField(max_digits=15, decimal_places=2)
    amount      = models.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        app_label = "fin"

    def __str__(self):
        return f"{self.description} × {self.quantity} = {self.amount}"


class BillPayment(models.Model):
    """One payment against a Bill."""
    id            = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill          = models.ForeignKey(Bill, on_delete=models.CASCADE, related_name="fin_payments")
    bank_account  = models.ForeignKey(
        "fin.Account", on_delete=models.PROTECT, related_name="fin_bill_payments",
        limit_choices_to={"is_bank": True},
        help_text="Bank account the payment is made from",
    )
    date          = models.DateField()
    amount        = models.DecimalField(max_digits=15, decimal_places=2)
    reference     = models.CharField(max_length=255, blank=True, default="")
    notes         = models.TextField(blank=True, default="")
    journal_entry = models.OneToOneField(
        "fin.JournalEntry", on_delete=models.PROTECT, null=True, blank=True,
        related_name="fin_bill_payment",
    )
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "fin"
        ordering  = ["-date"]

    def __str__(self):
        return f"Payment NPR {self.amount:,} for {self.bill}"
