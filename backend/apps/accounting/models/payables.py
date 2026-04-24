import uuid
import datetime
from decimal import Decimal
from django.db import models
from django.db.models import Sum
from .ledger import Account


ZERO = Decimal("0.00")


class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.CharField(max_length=500, blank=True, null=True)
    pan_number = models.CharField(max_length=20, blank=True, null=True, help_text="PAN/VAT registration number")
    category = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="e.g. Civil Contractor, Electrical, Material Supplier, Labor"
    )
    
    # Fields imported from legacy Supplier
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    photo = models.ImageField(upload_to='vendors/', null=True, blank=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    branch = models.CharField(max_length=100, blank=True, null=True)
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="purchase_orders")
    date = models.DateField()
    description = models.CharField(max_length=500)
    total_amount = models.DecimalField(max_digits=15, decimal_places=2)
    project = models.ForeignKey('core.HouseProject', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounting_purchase_orders')
    phase = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True, related_name='accounting_purchase_orders')
    notes = models.TextField(blank=True)
    # Does not generate a GL entry. It is a commitment.

    def __str__(self):
        return f"PO-{self.id.hex[:6].upper()} | {self.vendor.name}"


class VendorBill(models.Model):
    """
    An invoice received from a vendor.
    GL Entry on create: Debit Expense Account, Credit Accounts Payable.
    """
    class PaymentStatus(models.TextChoices):
        UNPAID  = "UNPAID",  "Unpaid"
        PARTIAL = "PARTIAL", "Partially Paid"
        PAID    = "PAID",    "Fully Paid"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="bills")
    date = models.DateField()
    due_date = models.DateField(blank=True, null=True)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    description = models.CharField(max_length=500)
    amount = models.DecimalField(max_digits=15, decimal_places=2)

    # Cost tracking
    expense_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="expense_bills")
    project = models.ForeignKey('core.HouseProject', on_delete=models.SET_NULL, null=True, blank=True)
    phase = models.ForeignKey('core.ConstructionPhase', on_delete=models.SET_NULL, null=True, blank=True)

    journal_entry = models.OneToOneField(
        'accounting.JournalEntry', on_delete=models.PROTECT, null=True, blank=True
    )

    class Meta:
        ordering = ['-date']

    @property
    def paid_amount(self):
        return self.payments.aggregate(total=Sum('amount'))['total'] or ZERO

    @property
    def outstanding(self):
        return self.amount - self.paid_amount

    @property
    def payment_status(self):
        paid = self.paid_amount
        if paid <= ZERO:
            return self.PaymentStatus.UNPAID
        if paid >= self.amount:
            return self.PaymentStatus.PAID
        return self.PaymentStatus.PARTIAL

    @property
    def is_overdue(self):
        if self.due_date and self.payment_status != self.PaymentStatus.PAID:
            return self.due_date < datetime.date.today()
        return False

    def __str__(self):
        return f"Bill {self.invoice_number or self.id.hex[:6].upper()} from {self.vendor}"


class BillPayment(models.Model):
    """
    Payment to a vendor.
    GL Entry: Debit Accounts Payable, Credit Bank Account.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill = models.ForeignKey(VendorBill, on_delete=models.PROTECT, related_name="payments")
    date = models.DateField()
    bank_account = models.ForeignKey(Account, on_delete=models.PROTECT, related_name="payments_made")
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    reference = models.CharField(max_length=255, blank=True, null=True, help_text="Cheque/transfer no.")
    notes = models.CharField(max_length=500, blank=True)

    journal_entry = models.OneToOneField(
        'accounting.JournalEntry', on_delete=models.PROTECT, null=True, blank=True
    )

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Payment NPR {self.amount:,.0f} for {self.bill}"
