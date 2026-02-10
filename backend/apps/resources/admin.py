from django.contrib import admin
from .models import Supplier, Contractor, Material, MaterialTransaction, Document

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'phone', 'pan_number', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'pan_number', 'contact_person')

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ('name', 'role', 'phone', 'is_active')
    list_filter = ('role', 'is_active')
    search_fields = ('name', 'phone')

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'current_stock', 'unit', 'min_stock_level')
    list_filter = ('category',)
    search_fields = ('name',)

@admin.register(MaterialTransaction)
class MaterialTransactionAdmin(admin.ModelAdmin):
    list_display = ('material', 'transaction_type', 'quantity', 'date')
    list_filter = ('transaction_type', 'date')
    search_fields = ('material__name', 'notes')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('title', 'description')
