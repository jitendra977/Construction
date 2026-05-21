from rest_framework import serializers
from ..models.vendor import Vendor


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Vendor
        fields = [
            "id", "name", "phone", "address", "pan_number",
            "category", "contact_person", "email", "photo",
            "bank_name", "account_number", "branch", "is_active",
        ]
        read_only_fields = ["id"]
