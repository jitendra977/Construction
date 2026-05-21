"""
BudgetCategory & BudgetAllocation — simple project budgeting.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum


class BudgetCategory(models.Model):
    """
    A named bucket of spending (e.g. Foundation, Roofing, Labour).
    """
    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    project     = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE,
        related_name="fin_budget_categories",
    )
    # Optional link to a GL Expense account for auto-tracking
    gl_account  = models.ForeignKey(
        "financials.Account", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_budget_categories",
        limit_choices_to={"account_type": "EXPENSE"},
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)
    sequence    = models.IntegerField(default=0)

    class Meta:
        app_label = "financials"
        db_table  = "fin_budgetcategory"
        ordering  = ["sequence", "name"]

    def __str__(self):
        return self.name

    @property
    def allocation(self) -> Decimal:
        """Total estimated budget = sum of all phase-wise allocated amounts."""
        result = self.fin_allocations.aggregate(total=Sum("allocated_amount"))
        return result["total"] or Decimal("0.00")

    @property
    def total_spent(self) -> Decimal:
        """Total actual spend from:
        - apps.financials.Expense (new system)
        - apps.financials.BillItem (new system)
        - apps.finance.Expense via fin_budget_category FK (legacy expense form)
        """
        exp    = self.fin_expenses.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        billed = self.fin_bill_items.aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        # Legacy expenses recorded via apps.finance.Expense but tagged to this fin category
        try:
            legacy = self.finance_expenses.filter(
                is_inventory_usage=False
            ).aggregate(t=Sum("amount"))["t"] or Decimal("0.00")
        except Exception:
            legacy = Decimal("0.00")
        return exp + billed + legacy

    @property
    def remaining_budget(self) -> Decimal:
        return self.allocation - self.total_spent


class BudgetAllocation(models.Model):
    """
    How much is allocated to a BudgetCategory for a specific phase.
    Each project phase gets its own allocation row.
    """
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category         = models.ForeignKey(BudgetCategory, on_delete=models.CASCADE, related_name="fin_allocations")
    phase            = models.ForeignKey(
        "core.ConstructionPhase", on_delete=models.CASCADE,
        related_name="fin_budget_allocations",
    )
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0.00"))
    notes            = models.CharField(max_length=500, blank=True, default="")
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "financials"
        db_table  = "fin_budgetallocation"
        ordering  = ["category__name"]
        unique_together = [["category", "phase"]]

    def __str__(self):
        return f"{self.category.name} / {self.phase.name} → NPR {self.allocated_amount:,}"
