from rest_framework import serializers

from .models import BudgetAlert, BudgetForecast, SupplierRateTrend


class BudgetForecastSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = BudgetForecast
        fields = "__all__"


class SupplierRateTrendSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    material_name = serializers.CharField(source="material.name", read_only=True)
    material_unit = serializers.CharField(source="material.unit", read_only=True)

    class Meta:
        model = SupplierRateTrend
        fields = "__all__"


class BudgetAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetAlert
        fields = "__all__"
