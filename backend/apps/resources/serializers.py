from rest_framework import serializers
from .models import Contractor, Material, Document, Supplier, MaterialTransaction

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class ContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contractor
        fields = '__all__'

class MaterialSerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = Material
        fields = '__all__'

    def get_status(self, obj):
        if obj.current_stock <= obj.min_stock_level:
            return 'LOW_STOCK'
        return 'IN_STOCK'

class MaterialTransactionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = MaterialTransaction
        fields = '__all__'

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
