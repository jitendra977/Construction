"""
Purchase — procurement and stock movement
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum


class PurchaseOrder(models.Model):

    class Status(models.TextChoices):
        DRAFT     = "DRAFT",     "Draft"
        ORDERED   = "ORDERED",   "Ordered"
        RECEIVED  = "RECEIVED",  "Received"
        CANCELLED = "CANCELLED", "Cancelled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_purchase_orders",
    )
    supplier      = models.ForeignKey(
        "resource.Supplier",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="purchase_orders",
    )
    order_number  = models.CharField(max_length=100, blank=True, default="")
    order_date    = models.DateField()
    expected_date = models.DateField(null=True, blank=True)
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    notes         = models.TextField(blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resource"
        ordering  = ["-order_date"]
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"

    def __str__(self):
        return f"PO/{self.order_number or self.id}"

    @property
    def total_amount(self) -> Decimal:
        total = Decimal("0")
        for item in self.items.all():
            total += item.quantity * item.unit_price
        return total

    @property
    def is_fully_received(self) -> bool:
        items = list(self.items.all())
        if not items:
            return False
        return all(item.received_qty >= item.quantity for item in items)


class PurchaseOrderItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        PurchaseOrder,
        on_delete=models.CASCADE,
        related_name="items",
    )
    material = models.ForeignKey(
        "resource.Material",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="purchase_items",
    )
    description  = models.CharField(max_length=255, blank=True, default="")
    quantity     = models.DecimalField(max_digits=15, decimal_places=3)
    unit_price   = models.DecimalField(max_digits=15, decimal_places=2)
    received_qty = models.DecimalField(max_digits=15, decimal_places=3, default=Decimal("0"))

    class Meta:
        app_label = "resource"
        verbose_name = "Purchase Order Item"
        verbose_name_plural = "Purchase Order Items"

    def __str__(self):
        return f"{self.description or (self.material.name if self.material else 'Item')} x{self.quantity}"


class StockMovement(models.Model):

    class MovementType(models.TextChoices):
        IN         = "IN",         "Stock In"
        OUT        = "OUT",        "Stock Out"
        ADJUSTMENT = "ADJUSTMENT", "Adjustment"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_stock_movements",
    )
    material = models.ForeignKey(
        "resource.Material",
        on_delete=models.CASCADE,
        related_name="movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity      = models.DecimalField(max_digits=15, decimal_places=3)
    unit_price    = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    reference     = models.CharField(max_length=255, blank=True, default="")
    notes         = models.TextField(blank=True, default="")
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "resource"
        ordering  = ["-created_at"]
        verbose_name = "Stock Movement"
        verbose_name_plural = "Stock Movements"

    def __str__(self):
        return f"{self.get_movement_type_display()} {self.quantity} {self.material.name}"

    @property
    def is_in(self) -> bool:
        return self.movement_type == self.MovementType.IN
