"""
fin.Expense — lightweight single-entry expense record.

Replaces apps.finance.Expense for new code.
No double-entry GL accounts required; just project, amount, type, date.
Payment receipts / contractor payments stay in apps.finance for now.
"""
import uuid
from django.db import models


class Expense(models.Model):
    EXPENSE_TYPE_CHOICES = [
        ("MATERIAL", "Material Purchase"),
        ("LABOR",    "Labour / Worker Payment"),
        ("FEES",     "Professional Fees"),
        ("GOVT",     "Government / Permit Fees"),
        ("OTHER",    "Other Miscellaneous"),
    ]

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title        = models.CharField(max_length=200)
    amount       = models.DecimalField(max_digits=12, decimal_places=2)
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES, default="OTHER")
    date         = models.DateField()
    paid_to      = models.CharField(max_length=200, blank=True, default="")
    is_paid      = models.BooleanField(default=False)
    notes        = models.TextField(blank=True, default="")

    phase   = models.ForeignKey(
        "core.ConstructionPhase", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="fin_expenses",
    )
    project = models.ForeignKey(
        "core.HouseProject", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="fin_expenses",
    )
    budget_category = models.ForeignKey(
        "financials.BudgetCategory", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="fin_expenses",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "financials"
        db_table  = "fin_expense"
        ordering  = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.title} — NPR {self.amount:,} ({self.date})"
