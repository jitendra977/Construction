from rest_framework import serializers
from ..models.purchase import PurchaseOrder, PurchaseOrderItem, StockMovement


class StockMovementSerializer(serializers.ModelSerializer):
    is_in         = serializers.BooleanField(read_only=True)
    phase_name    = serializers.CharField(source="phase.name",          read_only=True, default=None)
    supplier_name = serializers.CharField(source="supplier.name",       read_only=True, default=None)
    po_number     = serializers.CharField(source="purchase_order.order_number", read_only=True, default=None)

    class Meta:
        model  = StockMovement
        fields = [
            "id", "project", "material", "movement_type",
            "quantity", "unit_price", "reference", "notes",
            "phase", "phase_name",
            "supplier", "supplier_name",
            "purchase_order", "po_number",
            "vehicle_number", "delivered_by", "document_ref",
            "is_in", "created_at",
        ]
        read_only_fields = [
            "id", "is_in", "created_at",
            "phase_name", "supplier_name", "po_number",
        ]


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source="material.name", read_only=True, default=None)

    class Meta:
        model  = PurchaseOrderItem
        fields = [
            "id", "order", "material", "material_name", "description",
            "quantity", "unit_price", "received_qty",
        ]
        read_only_fields = ["id", "material_name"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items             = PurchaseOrderItemSerializer(many=True, read_only=True)
    stock_movements   = StockMovementSerializer(many=True, read_only=True)
    total_amount      = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    is_fully_received = serializers.BooleanField(read_only=True)
    supplier_name     = serializers.CharField(source="supplier.name", read_only=True, default=None)
    item_count        = serializers.IntegerField(source="items.count", read_only=True)

    class Meta:
        model  = PurchaseOrder
        fields = [
            "id", "project", "supplier", "supplier_name", "order_number",
            "order_date", "expected_date", "status", "notes",
            "signature_data", "signature_name",
            "total_amount", "is_fully_received", "item_count", "items", "stock_movements",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "total_amount", "is_fully_received",
            "supplier_name", "item_count", "created_at", "updated_at", "stock_movements"
        ]
