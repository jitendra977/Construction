from rest_framework import serializers
from .models import Contractor, Material, Document, Supplier, MaterialTransaction, WastageAlert, WastageThreshold

class SupplierSerializer(serializers.ModelSerializer):
    total_billed = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = Supplier
        fields = '__all__'

class ContractorSerializer(serializers.ModelSerializer):
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    display_name = serializers.CharField(read_only=True)
    display_email = serializers.EmailField(read_only=True)
    display_phone = serializers.CharField(read_only=True)

    class Meta:
        model = Contractor
        fields = [
            'id', 'user', 'name', 'role', 'phone', 'email', 'address', 'photo', 
            'citizenship_number', 'bank_details', 'skills', 'rate', 'is_active', 
            'joined_date', 'total_amount', 'total_paid', 'balance_due',
            'display_name', 'display_email', 'display_phone'
        ]

class MaterialSerializer(serializers.ModelSerializer):
    budget_category_name = serializers.CharField(source='budget_category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    supplier_email = serializers.CharField(source='supplier.email', read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = '__all__'

    def get_status(self, obj):
        if obj.current_stock <= obj.min_stock_level:
            return 'LOW_STOCK'
        return 'IN_STOCK'

class MaterialTransactionSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    room_name = serializers.CharField(source='room.name', read_only=True)
    funding_source_name = serializers.CharField(source='funding_source.name', read_only=True)
    unit_name = serializers.CharField(source='material.unit', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    receipt_image_url = serializers.SerializerMethodField()

    class Meta:
        model = MaterialTransaction
        fields = '__all__'

    def get_receipt_image_url(self, obj):
        if obj.receipt_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.receipt_image.url)
            return obj.receipt_image.url
        return None

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'

class WastageThresholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = WastageThreshold
        fields = '__all__'

class WastageAlertSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    threshold_data = WastageThresholdSerializer(source='threshold', read_only=True)
    transaction_purpose = serializers.CharField(source='transaction.purpose', read_only=True)
    transaction_notes = serializers.CharField(source='transaction.notes', read_only=True)
    transaction_qty = serializers.DecimalField(source='transaction.quantity', max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = WastageAlert
        fields = '__all__'
