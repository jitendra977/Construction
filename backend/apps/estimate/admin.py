from django.contrib import admin
from .models import MaterialRate, RateRevision, LaborRate, Estimate, EstimateSection, EstimateItem


@admin.register(MaterialRate)
class MaterialRateAdmin(admin.ModelAdmin):
    list_display  = ["key", "name", "category", "unit", "rate", "region", "updated_at"]
    list_filter   = ["category", "region", "is_active"]
    search_fields = ["key", "name"]
    readonly_fields = ["updated_at"]


@admin.register(RateRevision)
class RateRevisionAdmin(admin.ModelAdmin):
    list_display  = ["material", "old_rate", "new_rate", "change_pct", "created_at"]
    list_filter   = ["material__category"]
    readonly_fields = ["created_at"]


@admin.register(LaborRate)
class LaborRateAdmin(admin.ModelAdmin):
    list_display = ["trade", "daily_rate", "region", "updated_at"]
    readonly_fields = ["updated_at"]


class EstimateItemInline(admin.TabularInline):
    model  = EstimateItem
    extra  = 0
    fields = ["label", "category", "quantity", "unit", "unit_rate", "wastage_pct", "total"]
    readonly_fields = ["total"]


class EstimateSectionInline(admin.TabularInline):
    model  = EstimateSection
    extra  = 0
    fields = ["name", "phase_key", "order", "material_subtotal", "labor_subtotal", "subtotal"]
    readonly_fields = ["material_subtotal", "labor_subtotal", "subtotal"]


@admin.register(EstimateSection)
class EstimateSectionAdmin(admin.ModelAdmin):
    list_display = ["estimate", "name", "phase_key", "subtotal"]
    inlines      = [EstimateItemInline]


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display   = ["name", "project", "quality_tier", "status", "grand_total", "created_at"]
    list_filter    = ["status", "quality_tier"]
    search_fields  = ["name", "project__name"]
    readonly_fields = ["material_total", "labor_total", "contingency_amount", "grand_total", "created_at", "updated_at"]
    inlines        = [EstimateSectionInline]
