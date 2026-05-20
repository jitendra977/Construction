"""
apps.worker.models
~~~~~~~~~~~~~~~~~~
Minimal models for the Worker Portal.
Keeps data that has no natural home in another app.
"""
from django.db import models
from django.conf import settings


class MaterialRequest(models.Model):
    """
    A field worker's request to restock a material.
    Visible to admins via the resource dashboard.
    """

    class Status(models.TextChoices):
        PENDING   = "PENDING",   "Pending"
        APPROVED  = "APPROVED",  "Approved"
        DELIVERED = "DELIVERED", "Delivered"
        REJECTED  = "REJECTED",  "Rejected"

    # Who requested
    requested_by = models.ForeignKey(
        "workforce.WorkforceMember",
        on_delete=models.SET_NULL,
        null=True,
        related_name="material_requests",
    )

    # What material
    material = models.ForeignKey(
        "resource.Material",
        on_delete=models.CASCADE,
        related_name="requests",
    )

    # How much
    quantity_requested = models.DecimalField(max_digits=15, decimal_places=3)

    # Optional context
    notes = models.TextField(blank=True, default="")

    # Lifecycle
    status     = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="reviewed_material_requests",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "worker"
        ordering  = ["-created_at"]
        verbose_name        = "Material Request"
        verbose_name_plural = "Material Requests"

    def __str__(self):
        return (
            f"{self.material.name} ×{self.quantity_requested} "
            f"— {self.requested_by} [{self.status}]"
        )
