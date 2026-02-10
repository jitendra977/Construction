from django.contrib import admin
from .models import BudgetCategory, Expense, Payment

@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'allocation')
    search_fields = ('name',)

class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'category', 'date', 'is_paid', 'paid_to')
    list_filter = ('category', 'is_paid', 'date', 'phase')
    search_fields = ('title', 'paid_to')
    date_hierarchy = 'date'
    inlines = [PaymentInline]

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('expense', 'amount', 'date', 'method')
    list_filter = ('method', 'date')
    search_fields = ('expense__title', 'reference_id')
