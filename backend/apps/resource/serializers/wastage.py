from rest_framework import serializers
from ..models.wastage import WastageThreshold, WastageAlert


class WastageThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model  = WastageThreshold
        fields = '__all__'


class WastageAlertSerializer(serializers.ModelSerializer):
    material_name       = serializers.CharField(source='material.name',           read_only=True)
    material_unit       = serializers.CharField(source='material.unit',           read_only=True)
    threshold_data      = WastageThresholdSerializer(source='threshold',          read_only=True)
    transaction_purpose = serializers.CharField(source='transaction.purpose',     read_only=True)
    transaction_notes   = serializers.CharField(source='transaction.notes',       read_only=True)
    transaction_qty     = serializers.DecimalField(
        source='transaction.quantity', max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model  = WastageAlert
        fields = '__all__'
