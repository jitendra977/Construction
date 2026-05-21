"""
ContractorContract + ContractorInstallment + InstallmentPayment

Flow:
  1. Create ContractorContract (project + contractor + total amount)
  2. Define ContractorInstallments (milestones)
  3. For each milestone, record one or more InstallmentPayments
     (e.g. ₹18L advance paid in 3 tranches from different bank accounts)
  4. Installment status auto-computes: PENDING → PARTIAL → PAID
  5. Each payment posts: DR Construction Expense / CR Bank Account
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum


class ContractorContract(models.Model):

    class Status(models.TextChoices):
        ACTIVE    = "ACTIVE",    "Active"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"
        ON_HOLD   = "ON_HOLD",   "On Hold"

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project         = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE,
        related_name="fin_contractor_contracts",
    )
    contractor_name = models.CharField(max_length=255)
    contract_number = models.CharField(max_length=100, blank=True, default="")
    total_amount    = models.DecimalField(max_digits=15, decimal_places=2)
    contract_date   = models.DateField(null=True, blank=True)
    start_date      = models.DateField(null=True, blank=True)
    end_date        = models.DateField(null=True, blank=True)
    status          = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    notes           = models.TextField(blank=True, default="")
    document        = models.FileField(upload_to="fin/contract_documents/", null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "financials"
        db_table  = "fin_contractorcontract"
        ordering  = ["-created_at"]

    def __str__(self):
        return f"{self.contractor_name} — NPR {self.total_amount:,}"

    @property
    def total_paid(self) -> Decimal:
        agg = InstallmentPayment.objects.filter(
            installment__contract=self
        ).aggregate(total=Sum("amount"))
        return agg["total"] or Decimal("0.00")

    @property
    def total_pending(self) -> Decimal:
        return max(self.total_amount - self.total_paid, Decimal("0.00"))

    @property
    def paid_count(self) -> int:
        return self.fin_installments.filter(
            status=ContractorInstallment.Status.PAID
        ).count()

    @property
    def total_installments(self) -> int:
        return self.fin_installments.count()

    @property
    def progress_pct(self) -> float:
        if self.total_amount > 0:
            return float(min(100, (self.total_paid / self.total_amount) * 100))
        return 0.0


class ContractorInstallment(models.Model):

    class Status(models.TextChoices):
        PENDING = "PENDING",  "Pending"
        PARTIAL = "PARTIAL",  "Partially Paid"
        PAID    = "PAID",     "Fully Paid"
        OVERDUE = "OVERDUE",  "Overdue"

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract    = models.ForeignKey(
        ContractorContract, on_delete=models.CASCADE,
        related_name="fin_installments",
    )
    order       = models.PositiveSmallIntegerField(default=0)
    milestone   = models.CharField(max_length=255)
    amount      = models.DecimalField(max_digits=15, decimal_places=2)
    percentage  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    due_date    = models.DateField(null=True, blank=True)
    notes       = models.TextField(blank=True, default="")
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "financials"
        db_table  = "fin_contractorinstallment"
        ordering  = ["contract", "order"]

    def __str__(self):
        return f"#{self.order} {self.milestone} — NPR {self.amount:,} [{self.status}]"

    # ── Computed from payments ────────────────────────────────────────────────

    @property
    def total_paid(self) -> Decimal:
        agg = self.fin_payments.aggregate(total=Sum("amount"))
        return agg["total"] or Decimal("0.00")

    @property
    def remaining(self) -> Decimal:
        return max(self.amount - self.total_paid, Decimal("0.00"))

    @property
    def payment_count(self) -> int:
        return self.fin_payments.count()

    @property
    def last_paid_date(self):
        last = self.fin_payments.order_by("-date").first()
        return last.date if last else None

    def recompute_status(self):
        """Call after adding/removing a payment to sync status field."""
        paid = self.total_paid
        if paid <= 0:
            self.status = self.Status.PENDING
        elif paid >= self.amount:
            self.status = self.Status.PAID
        else:
            self.status = self.Status.PARTIAL
        self.save(update_fields=["status", "updated_at"])


class InstallmentPayment(models.Model):
    """One tranche of payment against a ContractorInstallment."""

    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    installment     = models.ForeignKey(
        ContractorInstallment, on_delete=models.CASCADE,
        related_name="fin_payments",
    )
    bank_account    = models.ForeignKey(
        "financials.Account", on_delete=models.PROTECT,
        related_name="fin_installment_payments",
        limit_choices_to={"is_bank": True},
    )
    expense_account = models.ForeignKey(
        "financials.Account", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_installment_expenses",
        limit_choices_to={"account_type": "EXPENSE"},
    )
    amount          = models.DecimalField(max_digits=15, decimal_places=2)
    date            = models.DateField()
    reference       = models.CharField(max_length=255, blank=True, default="")
    notes           = models.TextField(blank=True, default="")
    journal_entry   = models.OneToOneField(
        "financials.JournalEntry", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_installment_payment",
    )
    proof           = models.FileField(upload_to="fin/contractor_payments/", null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "financials"
        db_table  = "fin_installmentpayment"
        ordering  = ["date", "created_at"]

    def __str__(self):
        return f"NPR {self.amount:,} on {self.date} — {self.installment.milestone}"
