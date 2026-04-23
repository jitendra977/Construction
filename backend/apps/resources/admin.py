from django.contrib import admin
from .models import Contractor, Material, MaterialTransaction, Document

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
    list_display = ('display_name', 'project', 'user', 'role', 'phone', 'rate', 'is_active')
    list_filter = ('project', 'role', 'is_active', HasUserFilter)
    search_fields = ('name', 'user__username', 'user__email', 'phone', 'skills')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': (('project', 'user', 'role'), ('name', 'is_active'))
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
        if obj and obj.user:
            readonly.extend(['name', 'email', 'phone'])
        return readonly

@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'category', 'unit', 'current_stock', 'min_stock_level', 'avg_cost_per_unit')
    list_filter = ('project', 'category', 'unit')
    search_fields = ('name',)

@admin.register(MaterialTransaction)
class MaterialTransactionAdmin(admin.ModelAdmin):
    list_display = ('material', 'transaction_type', 'quantity', 'unit_price', 'date', 'supplier')
    list_filter = ('material__project', 'transaction_type', 'date', 'material')
    search_fields = ('notes',)
    date_hierarchy = 'date'

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'uploaded_at')
    list_filter = ('document_type', 'uploaded_at')
    search_fields = ('title', 'description')
