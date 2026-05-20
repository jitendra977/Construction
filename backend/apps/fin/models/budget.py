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
        "fin.Account", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="fin_budget_categories",
        limit_choices_to={"account_type": "EXPENSE"},
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "fin"
        ordering  = ["name"]

    def __str__(self):
        return self.name

    @property
    def allocation(self) -> Decimal:
        """Total estimated budget = sum of all phase-wise allocated amounts."""
        result = self.fin_allocations.aggregate(total=Sum("allocated_amount"))
        return result["total"] or Decimal("0.00")

    @property
    def total_spent(self) -> Decimal:
        """Total actual spend.
        Tries to pull from the legacy finance.Expense records that are linked
        to a matching BudgetCategory in the old app (same name, same project).
        Falls back to zero if none found.
        """
        try:
            from apps.finance.models import BudgetCategory as OldCat
            old_cat = OldCat.objects.filter(
                name=self.name,
                project_id=self.project_id,
            ).first()
            if old_cat:
                return old_cat.total_spent
        except Exception:
            pass
        return Decimal("0.00")

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
        app_label = "fin"
        ordering  = ["category__name"]
        unique_together = [["category", "phase"]]

    def __str__(self):
        return f"{self.category.name} / {self.phase.name} → NPR {self.allocated_amount:,}"
