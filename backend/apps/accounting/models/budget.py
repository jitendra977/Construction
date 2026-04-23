import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from apps.core.models import HouseProject, ConstructionPhase

class PhaseBudgetLine(models.Model):
    """
    Budget allocated for a specific construction phase.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(HouseProject, on_delete=models.CASCADE, related_name="budgets")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.CASCADE, related_name="budgets")
    budgeted_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('project', 'phase')
        ordering = ['phase__order']

    def __str__(self):
        return f"{self.phase.name} Budget: {self.budgeted_amount}"

class BudgetRevision(models.Model):
    """
    Track changes to the phase budget.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget_line = models.ForeignKey(PhaseBudgetLine, on_delete=models.CASCADE, related_name="revisions")
    date = models.DateTimeField(auto_now_add=True)
    previous_amount = models.DecimalField(max_digits=15, decimal_places=2)
    new_amount = models.DecimalField(max_digits=15, decimal_places=2)
    reason = models.CharField(max_length=500)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Revision to {self.budget_line.phase.name}: {self.new_amount}"
