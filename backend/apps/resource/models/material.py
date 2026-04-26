"""
Material — construction materials inventory
"""
import uuid
from decimal import Decimal
from django.db import models


class Material(models.Model):

    class Category(models.TextChoices):
        CEMENT      = "CEMENT",      "Cement"
        STEEL       = "STEEL",       "Steel"
        SAND        = "SAND",        "Sand"
        AGGREGATE   = "AGGREGATE",   "Aggregate"
        BRICK       = "BRICK",       "Brick"
        WOOD        = "WOOD",        "Wood"
        ELECTRICAL  = "ELECTRICAL",  "Electrical"
        PLUMBING    = "PLUMBING",    "Plumbing"
        OTHER       = "OTHER",       "Other"

    class Unit(models.TextChoices):
        KG        = "KG",        "Kilogram"
        BAG       = "BAG",       "Bag"
        PIECE     = "PIECE",     "Piece"
        METER     = "METER",     "Meter"
        SQ_METER  = "SQ_METER",  "Square Meter"
        CU_METER  = "CU_METER",  "Cubic Meter"
        LITER     = "LITER",     "Liter"
        TON       = "TON",       "Ton"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_materials",
    )
    name        = models.CharField(max_length=255)
    category    = models.CharField(max_length=20, choices=Category.choices, default=Category.OTHER)
    unit        = models.CharField(max_length=20, choices=Unit.choices, default=Unit.PIECE)
    unit_price  = models.DecimalField(max_digits=15, decimal_places=2)
    stock_qty   = models.DecimalField(max_digits=15, decimal_places=3, default=Decimal("0"))
    reorder_level = models.DecimalField(max_digits=15, decimal_places=3, default=Decimal("0"))
    description = models.TextField(blank=True, default="")
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resource"
        ordering  = ["name"]
        verbose_name = "Material"
        verbose_name_plural = "Materials"

    def __str__(self):
        return f"{self.name} ({self.get_unit_display()})"

    @property
    def is_low_stock(self) -> bool:
        return self.reorder_level > 0 and self.stock_qty <= self.reorder_level
