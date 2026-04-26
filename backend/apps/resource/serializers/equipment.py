from rest_framework import serializers
from ..models.equipment import Equipment


class EquipmentSerializer(serializers.ModelSerializer):

    class Meta:
        model  = Equipment
        fields = [
            "id", "project", "name", "equipment_type", "status",
            "daily_rate", "quantity", "description", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
