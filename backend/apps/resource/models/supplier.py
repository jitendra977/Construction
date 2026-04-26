"""
Supplier — vendor management
"""
import uuid
from django.db import models


class Supplier(models.Model):

    class Specialty(models.TextChoices):
        MATERIALS  = "Materials",  "Materials"
        EQUIPMENT  = "Equipment",  "Equipment"
        LABOR      = "Labor",      "Labor"
        GENERAL    = "General",    "General"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_suppliers",
    )
    name           = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255, blank=True, default="")
    phone          = models.CharField(max_length=20, blank=True, default="")
    email          = models.EmailField(blank=True, default="")
    address        = models.TextField(blank=True, default="")
    specialty      = models.CharField(max_length=20, choices=Specialty.choices, default=Specialty.GENERAL)
    is_active      = models.BooleanField(default=True)
    notes          = models.TextField(blank=True, default="")
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resource"
        ordering  = ["name"]
        verbose_name = "Supplier"
        verbose_name_plural = "Suppliers"

    def __str__(self):
        return self.name
