from django.contrib import admin
from .models import Supplier, Contractor, Material, MaterialTransaction, Document

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'contact_person', 'phone', 'pan_number')

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'phone', 'rate', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('name', 'phone', 'skills')

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'unit', 'current_stock', 'min_stock_level', 'avg_cost_per_unit')
    list_filter = ('category', 'unit')
    search_fields = ('name',)

@admin.register(MaterialTransaction)
class MaterialTransactionAdmin(admin.ModelAdmin):
    list_display = ('material', 'transaction_type', 'quantity', 'unit_price', 'date', 'supplier')
    list_filter = ('transaction_type', 'date', 'material')
    search_fields = ('notes',)
    date_hierarchy = 'date'

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('title', 'description')
