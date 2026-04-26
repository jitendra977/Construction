"""
Equipment — machinery and tools
"""
import uuid
from django.db import models


class Equipment(models.Model):

    class EquipmentType(models.TextChoices):
        HEAVY   = "HEAVY",   "Heavy Machinery"
        LIGHT   = "LIGHT",   "Light Equipment"
        TOOL    = "TOOL",    "Tool"
        VEHICLE = "VEHICLE", "Vehicle"
        OTHER   = "OTHER",   "Other"

    class Status(models.TextChoices):
        AVAILABLE   = "AVAILABLE",   "Available"
        IN_USE      = "IN_USE",      "In Use"
        MAINTENANCE = "MAINTENANCE", "Under Maintenance"
        RETIRED     = "RETIRED",     "Retired"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_equipment",
    )
    name           = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=20, choices=EquipmentType.choices, default=EquipmentType.OTHER)
    status         = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    daily_rate     = models.DecimalField(max_digits=15, decimal_places=2)
    quantity       = models.IntegerField(default=1)
    description    = models.TextField(blank=True, default="")
    is_active      = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resource"
        ordering  = ["name"]
        verbose_name = "Equipment"
        verbose_name_plural = "Equipment"

    def __str__(self):
        return f"{self.name} [{self.get_status_display()}]"
