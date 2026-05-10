import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum
from simple_history.models import HistoricalRecords

class PurchaseOrder(models.Model):

    class Status(models.TextChoices):
        DRAFT     = "DRAFT",     "Draft"
        ORDERED   = "ORDERED",   "Ordered"
        PARTIAL   = "PARTIAL",   "Partially Received"
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
    signature_data = models.TextField(blank=True, default="", help_text="Base64 encoded signature image")
    signature_name = models.CharField(max_length=100, blank=True, default="", help_text="Name of person who signed")
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    history = HistoricalRecords()

    class Meta:
        app_label = "resource"
        ordering  = ["-order_date"]
        verbose_name = "Purchase Order"
        verbose_name_plural = "Purchase Orders"

    def __str__(self):
        return f"PO/{self.order_number or self.id}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            from django.utils import timezone
            # 1. Prefix: 2 letters of Project Name
            project_name = getattr(self.project, 'name', 'PJ')
            prefix = "".join([word[0] for word in project_name.split()][:2]).upper()
            if len(prefix) < 2: prefix = project_name[:2].upper()
            
            # 2. Project ID + Date String
            p_id = self.project.id
            today_str = timezone.now().strftime("%y%m%d")
            
            # 3. Sequence: Total orders for this project
            count = PurchaseOrder.objects.filter(project=self.project).count() + 1
            
            # Format: ME1-260510-001
            self.order_number = f"{prefix}{p_id}-{today_str}-{count:03d}"
            
        super().save(*args, **kwargs)

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

    @property
    def is_partially_received(self) -> bool:
        items = list(self.items.all())
        return any(item.received_qty > 0 for item in items)


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

    history = HistoricalRecords()

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
    supplier = models.ForeignKey(
        "resource.Supplier",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="stock_movements",
    )
    purchase_order = models.ForeignKey(
        "resource.PurchaseOrder",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="stock_movements",
    )
    phase = models.ForeignKey(
        "core.ConstructionPhase",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="resource_stock_movements",
    )
    movement_type = models.CharField(max_length=20, choices=MovementType.choices)
    quantity      = models.DecimalField(max_digits=15, decimal_places=3)
    unit_price    = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    reference     = models.CharField(max_length=255, blank=True, default="")
    notes         = models.TextField(blank=True, default="")
    
    # Shipment Tracking Metadata
    vehicle_number = models.CharField(max_length=50, blank=True, default="")
    delivered_by   = models.CharField(max_length=100, blank=True, default="")
    document_ref   = models.CharField(max_length=100, blank=True, default="", help_text="Delivery Note or Invoice #")
    
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
