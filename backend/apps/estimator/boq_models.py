"""
Bill of Quantities (BoQ) Auto-Generator models.

Design:
  BoQTemplate       — reusable recipe describing a house "profile"
                      (e.g. "2-storey 1000 sqft with 3 bedrooms"). Contains
                      a set of BoQTemplateItem rows with quantity formulas.
  BoQTemplateItem   — one row of a template: phase, material key, formula
                      (simple arithmetic with variables like `total_sqft`,
                      `storeys`, `bedrooms`).
  GeneratedBoQ      — a materialised BoQ for a specific HouseProject.
                      Carries totals and snapshot state.
  GeneratedBoQItem  — computed row: material/labor, qty, unit, unit_rate,
                      total. Links back to a ConstructionPhase when known.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.db import models


class BoQTemplate(models.Model):
    """
    A parametric BoQ recipe. Kept small — the formulas are evaluated at
    generation time against a variable dictionary we build from project
    inputs (total_sqft, storeys, bedrooms, bathrooms, roof_type, etc.).
    """

    QUALITY_CHOICES = [
        ("BUDGET", "Budget"),
        ("STANDARD", "Standard"),
        ("PREMIUM", "Premium"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    quality_tier = models.CharField(
        max_length=10, choices=QUALITY_CHOICES, default="STANDARD"
    )
    min_sqft = models.PositiveIntegerField(default=0)
    max_sqft = models.PositiveIntegerField(default=0, help_text="0 = unbounded")
    storeys_applicable = models.CharField(
        max_length=20, blank=True,
        help_text="Comma-separated list e.g. '1,2,3' — empty means any",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["quality_tier", "name"]

    def __str__(self):
        return f"{self.name} ({self.get_quality_tier_display()})"


class BoQTemplateItem(models.Model):
    """
    One parametric row of a BoQ template. Each row carries a formula
    like '0.4 * total_sqft' that multiplies a canonical rate key from
    ConstructionRate.
    """

    CATEGORY_CHOICES = [
        ("MATERIAL", "Material"),
        ("LABOR", "Labor"),
        ("EQUIPMENT", "Equipment"),
        ("OTHER", "Other"),
    ]

    template = models.ForeignKey(
        BoQTemplate, on_delete=models.CASCADE, related_name="items"
    )
    phase_key = models.CharField(
        max_length=40,
        help_text="Canonical phase key (e.g. 'foundation', 'slab_dhalaan')",
    )
    label = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    rate_key = models.CharField(
        max_length=50,
        help_text="Points at ConstructionRate.key (e.g. 'CEMENT', 'SAND')",
    )
    unit = models.CharField(max_length=20)
    quantity_formula = models.CharField(
        max_length=200,
        help_text="Arithmetic formula over variables — e.g. '0.4 * total_sqft'",
    )
    waste_pct = models.FloatField(default=5.0, help_text="Default waste factor")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["phase_key", "label"]

    def __str__(self):
        return f"{self.template.name} · {self.label}"


class GeneratedBoQ(models.Model):
    """
    A concrete BoQ snapshot for a HouseProject. Immutable totals once
    frozen; regenerating creates a NEW row so we always have an audit
    trail of estimates.
    """

    project = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE, related_name="generated_boqs"
    )
    template = models.ForeignKey(
        BoQTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="generated_boqs",
    )

    # Inputs used for generation (snapshot for reproducibility)
    inputs = models.JSONField(default=dict)

    # Rolled-up totals
    material_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    labor_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    equipment_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    other_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    is_applied_to_budget = models.BooleanField(
        default=False,
        help_text="True once BudgetCategory rows have been auto-created/updated.",
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="generated_boqs",
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-generated_at"]

    def __str__(self):
        return f"BoQ #{self.pk} — {self.project} — Rs. {self.grand_total:,.0f}"


class GeneratedBoQItem(models.Model):
    """One computed row on a GeneratedBoQ."""

    boq = models.ForeignKey(
        GeneratedBoQ, on_delete=models.CASCADE, related_name="items"
    )
    phase_key = models.CharField(max_length=40, blank=True)
    label = models.CharField(max_length=200)
    category = models.CharField(max_length=20)
    rate_key = models.CharField(max_length=50, blank=True)

    quantity = models.DecimalField(max_digits=12, decimal_places=3, default=0)
    unit = models.CharField(max_length=20, blank=True)
    unit_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    waste_pct = models.FloatField(default=0.0)
    total = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["phase_key", "label"]

    def __str__(self):
        return f"{self.label}: {self.quantity} {self.unit} = Rs. {self.total:,.0f}"
