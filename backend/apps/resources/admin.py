from django.contrib import admin
from .models import Supplier, Contractor, Material, MaterialTransaction, Document

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'contact_person', 'phone', 'category', 'is_active')
    list_filter = ('category', 'is_active')
    search_fields = ('name', 'contact_person', 'phone', 'pan_number')

class HasUserFilter(admin.SimpleListFilter):
    title = 'Has User Account'
    parameter_name = 'has_user'

    def lookups(self, request, model_admin):
        return (
            ('yes', 'Yes'),
            ('no', 'No'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'yes':
            return queryset.filter(user__isnull=False)
        if self.value() == 'no':
            return queryset.filter(user__isnull=True)

@admin.register(Contractor)
class ContractorAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'user', 'role', 'phone', 'rate', 'is_active')
    list_filter = ('role', 'is_active', HasUserFilter)
    search_fields = ('name', 'user__username', 'user__email', 'phone', 'skills')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': (('user', 'role'), ('name', 'is_active'))
        }),
        ('Contact Details', {
            'fields': (('email', 'phone'), 'address')
        }),
        ('Professional Details', {
            'fields': (('rate', 'joined_date'), 'skills', 'photo')
        }),
        ('Personal Details', {
            'fields': ('citizenship_number', 'bank_details')
        }),
    )
    readonly_fields = ('joined_date',)

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        # No extra readonly here because JS handles the 'disabled' state for UX
        # but we should still keep them readonly if the object ALREADY has a user
        if obj and obj.user:
            readonly.extend(['name', 'email', 'phone'])
        return readonly

    class Media:
        js = ('resources/js/contractor_admin.js',)

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
