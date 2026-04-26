from rest_framework import serializers
from ..models.material import Material


class MaterialSerializer(serializers.ModelSerializer):
    is_low_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model  = Material
        fields = [
            "id", "project", "name", "category", "unit",
            "unit_price", "stock_qty", "reorder_level",
            "description", "is_active", "is_low_stock",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "is_low_stock", "created_at", "updated_at"]
