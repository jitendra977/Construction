from django.db import models
from .material import Material
from .purchase import StockMovement


class WastageThreshold(models.Model):
    """Per-material thresholds that trigger wastage alerts."""
    material        = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='thresholds')
    warning_pct     = models.FloatField(default=8.0)
    critical_pct    = models.FloatField(default=15.0)
    notify_owner    = models.BooleanField(default=True)
    notify_engineer = models.BooleanField(default=True)

    class Meta:
        verbose_name        = "Wastage Threshold"
        verbose_name_plural = "Wastage Thresholds"

    def __str__(self):
        return f"{self.material.name} - Warn: {self.warning_pct}% Crit: {self.critical_pct}%"


class WastageAlert(models.Model):
    """Alert raised when material wastage exceeds a threshold."""
    SEVERITY = [('WARNING', 'Warning'), ('CRITICAL', 'Critical')]

    material      = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='alerts')
    threshold     = models.ForeignKey(WastageThreshold, on_delete=models.CASCADE)
    transaction   = models.ForeignKey(StockMovement, on_delete=models.CASCADE)
    severity      = models.CharField(max_length=10, choices=SEVERITY)
    wastage_pct   = models.FloatField()
    is_resolved   = models.BooleanField(default=False)
    resolved_note = models.TextField(blank=True, null=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = "Wastage Alert"
        verbose_name_plural = "Wastage Alerts"
        ordering            = ['-created_at']

    def __str__(self):
        return f"[{self.severity}] {self.material.name} - {self.wastage_pct}%"
