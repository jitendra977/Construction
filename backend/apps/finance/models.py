from django.db import models
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
    category = models.ForeignKey(BudgetCategory, on_delete=models.PROTECT, related_name='expenses')
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    supplier = models.ForeignKey('resources.Supplier', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    contractor = models.ForeignKey('resources.Contractor', on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    
    date = models.DateField()
    paid_to = models.CharField(max_length=200, help_text="Vendor or person paid")
    is_paid = models.BooleanField(default=True)
    
    receipt = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='expenses')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - Rs. {self.amount}"

class Payment(models.Model):
    """
    Record of payments made (could be installments).
    """
    PAYMENT_METHOD_CHOICES = [
        ('CASH', 'Cash'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('CHECK', 'Check'),
        ('UPI', 'UPI/Digital'),
        ('OTHER', 'Other'),
    ]

    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    reference_id = models.CharField(max_length=100, blank=True, help_text="Check number or Transaction ID")
    
    def __str__(self):
        return f"Payment of Rs. {self.amount} for {self.expense.title}"
