"""
PhaseBudgetLine — budget allocated per construction phase.

Reuses the existing `accounting_phasebudgetline` DB table via db_table.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings


class PhaseBudgetLine(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project         = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE, related_name="fin_budgets"
    )
    phase           = models.ForeignKey(
        "core.ConstructionPhase", on_delete=models.CASCADE, related_name="fin_budgets"
    )
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal("0.00"))
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        app_label    = "financials"
        db_table     = "accounting_phasebudgetline"  # reuse existing table
        unique_together = ("project", "phase")
        ordering     = ["phase__order"]

    def __str__(self):
        return f"{self.phase.name} Budget: {self.budgeted_amount}"


class BudgetRevision(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_line      = models.ForeignKey(PhaseBudgetLine, on_delete=models.CASCADE,
                                         related_name="revisions")
    date             = models.DateTimeField(auto_now_add=True)
    previous_amount  = models.DecimalField(max_digits=15, decimal_places=2)
    new_amount       = models.DecimalField(max_digits=15, decimal_places=2)
    reason           = models.CharField(max_length=500)
    created_by       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
                                         null=True, blank=True)

    class Meta:
        app_label = "financials"
        db_table  = "accounting_budgetrevision"  # reuse existing table

    def __str__(self):
        return f"Revision to {self.budget_line.phase.name}: {self.new_amount}"
