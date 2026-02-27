from django.db import models
from decimal import Decimal
from apps.core.models import ConstructionPhase
from apps.resources.models import Document

class BudgetCategory(models.Model):
    """
    Categories for expenses (e.g., Material, Labor, Permits).
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    allocation = models.DecimalField(max_digits=12, decimal_places=2, help_text="Allocated budget for this category")

    class Meta:
        verbose_name_plural = "Budget Categories"

    def __str__(self):
        return self.name

class Expense(models.Model):
    """
    Individual cost items.
    """
    EXPENSE_TYPE_CHOICES = [
        ('MATERIAL', 'Material Purchase'),
        ('LABOR', 'Labor/Worker Payment'),
        ('FEES', 'Professional Fees/Engineering'),
        ('GOVT', 'Government/Permit Fees'),
        ('OTHER', 'Other Miscellaneous'),
    ]

    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES, default='MATERIAL')
    category = models.ForeignKey(BudgetCategory, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    # Inventory Integration
    material = models.ForeignKey('resources.Material', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    quantity = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    supplier = models.ForeignKey('resources.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    contractor = models.ForeignKey('resources.Contractor', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    funding_source = models.ForeignKey('FundingSource', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    date = models.DateField()
    paid_to = models.CharField(max_length=200, help_text="Vendor or person paid")
    is_paid = models.BooleanField(default=True)
    
    receipt = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_paid(self):
        return sum(payment.amount for payment in self.payments.all())

    @property
    def balance_due(self):
        return self.amount - self.total_paid

    @property
    def status(self):
        paid = self.total_paid
        if paid >= self.amount:
            return 'PAID'
        elif paid > 0:
            return 'PARTIAL'
        else:
            return 'UNPAID'

    def __str__(self):
        return f"{self.title} - Rs. {self.amount} ({self.status})"

class Payment(models.Model):
    """
    Record of payments made (could be installments).
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Nagad (Cash)'),
        ('BANK_TRANSFER', 'Bank / ConnectIPS'),
        ('QR', 'eSewa/Khalti/Fonepay (QR)'),
        ('CHECK', 'Cheque'),
        ('OTHER', 'Other'),
    ]

    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='payments')
    funding_source = models.ForeignKey('FundingSource', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True, help_text="Check number or Transaction ID")
    notes = models.TextField(blank=True, help_text="Payment remarks/comments")
    
    def __str__(self):
        return f"Payment of Rs. {self.amount} for {self.expense.title}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_payment = None
        if not is_new:
            old_payment = Payment.objects.get(pk=self.pk)

        super().save(*args, **kwargs)

        if is_new and self.funding_source:
            # Deduct balance
            self.funding_source.current_balance -= self.amount
            self.funding_source.save()
            
            # Create debit transaction
            FundingTransaction.objects.create(
                funding_source=self.funding_source,
                amount=self.amount,
                transaction_type='DEBIT',
                date=self.date,
                description=f"Payment for: {self.expense.title}",
                payment=self
            )
        elif not is_new and old_payment:
            # If changed funding source or amount, we need to adjust
            if old_payment.funding_source != self.funding_source or old_payment.amount != self.amount:
                # Refund old
                if old_payment.funding_source:
                    old_payment.funding_source.current_balance += old_payment.amount
                    old_payment.funding_source.save()
                    old_payment.funding_transactions.all().delete()
                
                # Charge new
                if self.funding_source:
                    self.funding_source.current_balance -= self.amount
                    self.funding_source.save()
                    FundingTransaction.objects.create(
                        funding_source=self.funding_source,
                        amount=self.amount,
                        transaction_type='DEBIT',
                        date=self.date,
                        description=f"Payment for: {self.expense.title}",
                        payment=self
                    )

    def delete(self, *args, **kwargs):
        if self.funding_source:
            self.funding_source.current_balance += self.amount
            self.funding_source.save()
        super().delete(*args, **kwargs)

class FundingSource(models.Model):
    """
    Tracks where the money for the project is coming from.
    """
    SOURCE_TYPE_CHOICES = [
        ('OWN_MONEY', 'Personal Savings / Own Money (Nagad/Bachat)'),
        ('LOAN', 'Bank Loan (Karja)'),
        ('BORROWED', 'Borrowed from Friends/Family (Saapathi)'),
        ('OTHER', 'Other Source'),
    ]

    name = models.CharField(max_length=200, help_text="e.g. Nabil Bank Loan, Father's help")
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPE_CHOICES, default='OWN_MONEY')
    amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total allocation from this source")
    current_balance = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), help_text="Remaining available balance")
    default_payment_method = models.CharField(
        max_length=20, 
        choices=[
            ('CASH', 'Cash (Nagad)'),
            ('BANK_TRANSFER', 'Bank Transfer (ConnectIPS)'),
            ('CHECK', 'Cheque (Check)'),
            ('UPI', 'QR / Mobile Banking (eSewa/Khalti)'),
            ('OTHER', 'Other'),
        ],
        default='CASH'
    )
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Annual interest rate if applicable (%)")
    received_date = models.DateField()
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        is_new = self.id is None
        if is_new:
            self.current_balance = self.amount
        super().save(*args, **kwargs)
        
        if is_new:
            FundingTransaction.objects.create(
                funding_source=self,
                amount=self.amount,
                transaction_type='CREDIT',
                date=self.received_date,
                description="Initial Funding Allocation"
            )

    def __str__(self):
        return f"{self.name} (Bal: Rs. {self.current_balance})"

class FundingTransaction(models.Model):
    """
    History of money entering or leaving a funding source.
    """
    TRANSACTION_TYPE_CHOICES = [
        ('CREDIT', 'Credit (Top-up/Addition)'),
        ('DEBIT', 'Debit (Payment/Expense)'),
    ]

    funding_source = models.ForeignKey(FundingSource, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPE_CHOICES)
    date = models.DateField()
    description = models.CharField(max_length=255)
    
    # Optional link to a specific payment
    payment = models.ForeignKey('Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='funding_transactions')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type}: Rs. {self.amount} - {self.description}"
