from django.db import models
from decimal import Decimal
from apps.core.models import ConstructionPhase
from apps.resources.models import Document
from simple_history.models import HistoricalRecords

class BudgetCategory(models.Model):
    """
    Categories for expenses (e.g., Material, Labor, Permits).
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    allocation = models.DecimalField(max_digits=12, decimal_places=2, help_text="Allocated budget for this category")

    class Meta:
        verbose_name_plural = "Budget Categories"

    @property
    def total_spent(self):
        from django.db.models import Sum, Q
        result = self.expenses.filter(is_inventory_usage=False).aggregate(total=Sum('amount'))['total']
        return result or Decimal('0.00')

    @property
    def remaining_budget(self):
        return self.allocation - self.total_spent

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
    task = models.ForeignKey('tasks.Task', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    date = models.DateField()
    paid_to = models.CharField(max_length=200, help_text="Vendor or person paid")
    is_paid = models.BooleanField(default=True)
    
    receipt = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    notes = models.TextField(blank=True)
    is_inventory_usage = models.BooleanField(default=False, help_text="Represents internal cost allocation (Usage) to avoid double-counting in cashflow.")
    
    created_at = models.DateTimeField(auto_now_add=True)
    history = HistoricalRecords()

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

    def save(self, *args, **kwargs):
        # 0. Hierarchy Sync: If linked to a task, auto-set category and phase
        if self.task:
            if not self.category and self.task.category:
                self.category = self.task.category
            if not self.phase and self.task.phase:
                self.phase = self.task.phase

        # 1. Budget Protection: Check if this expense exceeds category allocation
        if self.category and (self.pk is None or 'amount' in kwargs.get('update_fields', [])):
            current_spent = self.category.total_spent
            if self.pk:
                # If editing, subtract old amount from current_spent to check correctly
                old_amount = Expense.objects.get(pk=self.pk).amount
                current_spent -= old_amount
            
            if current_spent + self.amount > self.category.allocation:
                from .signals import budget_exceeded
                budget_exceeded.send(sender=self.__class__, category=self.category, expense=self, amount_exceeded=(current_spent + self.amount - self.category.allocation))

        # 2. Status Sync: Initial check
        # Note: is_paid is officially synced by Payment.save()
        
        super().save(*args, **kwargs)

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
    proof_photo = models.ImageField(upload_to='payments/proofs/', null=True, blank=True, help_text="Upload proof of payment (screenshot/photo)")
    history = HistoricalRecords()
    
    def __str__(self):
        return f"Payment of Rs. {self.amount} for {self.expense.title}"

    # Logic moved to FinanceService. Side-effects in save() are dangerous 
    # and should be avoided for complex business flows.
    # We keep simple save() and delete() here for basic ORM usage, 
    # but application logic should use FinanceService.

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
class PhaseBudgetAllocation(models.Model):
    """
    Allocates a portion of a BudgetCategory to a specific ConstructionPhase.
    """
    category = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name='phase_allocations')
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.CASCADE, related_name='category_allocations')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('category', 'phase')
        verbose_name = "Phase Budget Allocation"
        verbose_name_plural = "Phase Budget Allocations"

    def __str__(self):
        return f"{self.category.name} -> {self.phase.name}: Rs. {self.amount}"
