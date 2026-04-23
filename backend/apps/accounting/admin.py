from django.contrib import admin
from .models import Vendor, PhaseBudgetLine

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'phone', 'email', 'get_balance_due')
    list_filter = ('category',)
    search_fields = ('name', 'phone', 'email', 'address')

    def get_balance_due(self, obj):
        return 0 # Placeholder for complex calculation
    get_balance_due.short_description = "Balance Due"

@admin.register(PhaseBudgetLine)
class PhaseBudgetLineAdmin(admin.ModelAdmin):
    list_display = ('phase', 'project', 'budgeted_amount', 'get_actual_spent')
    list_filter = ('project', 'phase')

    def get_actual_spent(self, obj):
        from apps.finance.models import Expense
        return sum(exp.amount for exp in Expense.objects.filter(phase=obj.phase, project=obj.project))
    get_actual_spent.short_description = "Actual Spent"
