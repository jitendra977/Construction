from rest_framework import serializers
from ..models.supplier import Supplier


class SupplierSerializer(serializers.ModelSerializer):

    class Meta:
        model  = Supplier
        fields = [
            "id", "project", "name", "contact_person", "phone",
            "email", "address", "specialty", "is_active", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
