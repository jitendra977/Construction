from django.contrib import admin
from .models import BudgetAlert, BudgetForecast, SupplierRateTrend

@admin.register(BudgetForecast)
class BudgetForecastAdmin(admin.ModelAdmin):
    list_display = (
        "id", "get_project", "category", "risk_level", "daily_burn_rate",
        "projected_total", "projected_overrun", "days_to_exhaustion",
        "confidence", "computed_at",
    )
    list_filter = ("category__project", "risk_level")

    def get_project(self, obj):
        return obj.category.project
    get_project.short_description = "Project"

@admin.register(SupplierRateTrend)
class SupplierRateTrendAdmin(admin.ModelAdmin):
    list_display = (
        "id", "supplier", "material", "change_pct_last_month",
        "avg_rate_30d", "avg_rate_90d", "transactions_count", "window_end",
    )
    list_filter = ("supplier", "material")
    search_fields = ("supplier__name", "material__name")

@admin.register(BudgetAlert)
class BudgetAlertAdmin(admin.ModelAdmin):
    list_display = ("id", "alert_type", "severity", "title", "is_resolved", "updated_at")
    list_filter = ("alert_type", "severity", "is_resolved")
    search_fields = ("title", "message", "scope_key")
