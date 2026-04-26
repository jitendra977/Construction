from rest_framework import serializers
from ..models.purchase import PurchaseOrder, PurchaseOrderItem, StockMovement


class PurchaseOrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model  = PurchaseOrderItem
        fields = [
            "id", "order", "material", "description",
            "quantity", "unit_price", "received_qty",
        ]
        read_only_fields = ["id"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items             = PurchaseOrderItemSerializer(many=True, read_only=True)
    total_amount      = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    is_fully_received = serializers.BooleanField(read_only=True)

    class Meta:
        model  = PurchaseOrder
        fields = [
            "id", "project", "supplier", "order_number",
            "order_date", "expected_date", "status", "notes",
            "total_amount", "is_fully_received", "items",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "total_amount", "is_fully_received", "created_at", "updated_at"]


class StockMovementSerializer(serializers.ModelSerializer):
    is_in = serializers.BooleanField(read_only=True)

    class Meta:
        model  = StockMovement
        fields = [
            "id", "project", "material", "movement_type",
            "quantity", "unit_price", "reference", "notes",
            "is_in", "created_at",
        ]
        read_only_fields = ["id", "is_in", "created_at"]
