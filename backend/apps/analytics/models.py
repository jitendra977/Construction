"""
Models for the Predictive Budget Engine.

BudgetForecast — snapshot of a projection for one BudgetCategory at a given
  time: when (if ever) will it run out, what is the projected total at the
  project's expected completion date, and how confident is the model?

SupplierRateTrend — rolling rate statistics per Supplier × Material, used
  by the alerts service to flag price spikes.

BudgetAlert — persisted alert rows shown in the Alerts Feed UI; supersede
  themselves by (scope, alert_type) so we don't drown the homeowner.
"""
from django.db import models
from django.conf import settings

from apps.finance.models import BudgetCategory
from apps.resources.models import Material
from apps.accounting.models import Vendor


class BudgetForecast(models.Model):
    """Latest forecast for a BudgetCategory — one row per category, refreshed."""

    category = models.OneToOneField(
        BudgetCategory,
        on_delete=models.CASCADE,
        related_name="forecast",
    )

    # Inputs snapshot
    allocation = models.DecimalField(max_digits=12, decimal_places=2)
    spent_to_date = models.DecimalField(max_digits=12, decimal_places=2)
    days_observed = models.PositiveIntegerField(default=0)

    # Model outputs
    daily_burn_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    weekly_burn_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    projected_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    projected_overrun = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    days_to_exhaustion = models.IntegerField(
        null=True, blank=True,
        help_text="Days until allocation is exhausted at current burn. Null if burn<=0.",
    )
    exhaustion_date = models.DateField(null=True, blank=True)

    # 0..1 — how well the linear model fits recent history (R² clipped to [0,1])
    confidence = models.FloatField(default=0.0)
    risk_level = models.CharField(
        max_length=10,
        choices=[("LOW", "Low"), ("MEDIUM", "Medium"), ("HIGH", "High")],
        default="LOW",
    )

    computed_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Forecast: {self.category.name} — {self.risk_level}"


class SupplierRateTrend(models.Model):
    """
    Snapshot of a rolling supplier × material price trend.

    Filled/updated by the `compute_rate_trends` service. The UI uses
    `change_pct_last_month` to drive the rate-trend chart & alerts.
    """

    supplier = models.ForeignKey(
        Vendor, on_delete=models.CASCADE, related_name="rate_trends"
    )
    material = models.ForeignKey(
        Material, on_delete=models.CASCADE, related_name="rate_trends"
    )

    first_seen_rate = models.DecimalField(max_digits=12, decimal_places=2)
    last_seen_rate = models.DecimalField(max_digits=12, decimal_places=2)
    avg_rate_30d = models.DecimalField(max_digits=12, decimal_places=2)
    avg_rate_90d = models.DecimalField(max_digits=12, decimal_places=2)
    change_pct_last_month = models.FloatField(
        default=0.0,
        help_text="% change comparing the latest 30-day avg vs the prior 30 days.",
    )
    transactions_count = models.PositiveIntegerField(default=0)

    window_end = models.DateField()
    computed_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("supplier", "material")
        ordering = ["-change_pct_last_month"]

    def __str__(self):
        return f"{self.material.name} @ {self.supplier.name}: {self.change_pct_last_month:+.1f}%"


class BudgetAlert(models.Model):
    """
    Persisted alert shown in the homeowner's feed.

    Uniqueness is (alert_type, scope_key) — regenerating the alerts list
    updates existing rows in place, so we don't spam notifications.
    """

    ALERT_TYPE_CHOICES = [
        ("FORECAST_OVERRUN", "Forecast Budget Overrun"),
        ("BURN_TOO_FAST", "Burn Rate Too Fast"),
        ("RATE_SPIKE", "Supplier Rate Spike"),
        ("LOW_STOCK_PROJECTION", "Projected Low Stock"),
    ]
    SEVERITY_CHOICES = [
        ("INFO", "Info"),
        ("WARNING", "Warning"),
        ("CRITICAL", "Critical"),
    ]

    alert_type = models.CharField(max_length=30, choices=ALERT_TYPE_CHOICES)
    scope_key = models.CharField(max_length=100, help_text="e.g. category:42 or supplier:3/material:8")

    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default="WARNING")

    data = models.JSONField(default=dict, blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_note = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("alert_type", "scope_key")
        ordering = ["-updated_at"]

    def __str__(self):
        return f"[{self.severity}] {self.title}"
