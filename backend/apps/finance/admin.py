from django.contrib import admin
from .models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction

@admin.register(FundingTransaction)
class FundingTransactionAdmin(admin.ModelAdmin):
    list_display = ('funding_source', 'amount', 'transaction_type', 'date', 'description')
    list_filter = ('transaction_type', 'date', 'funding_source')
    search_fields = ('description',)

@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'allocation')
    search_fields = ('name',)

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('title', 'amount', 'expense_type', 'category', 'date', 'paid_to', 'is_paid', 'funding_source')
    list_filter = ('expense_type', 'category', 'is_paid', 'date', 'funding_source')
    search_fields = ('title', 'paid_to', 'notes')
    date_hierarchy = 'date'

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('expense', 'amount', 'date', 'method', 'reference_id')
    list_filter = ('method', 'date')
    search_fields = ('reference_id',)

@admin.register(FundingSource)
class FundingSourceAdmin(admin.ModelAdmin):
    list_display = ('name', 'source_type', 'amount', 'interest_rate', 'received_date')
    list_filter = ('source_type', 'received_date')
    search_fields = ('name', 'notes')
