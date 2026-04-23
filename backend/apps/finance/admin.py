from django.contrib import admin
from .models import (
    Account,
    JournalEntry,
    JournalLine,
    BudgetCategory,
    PhaseBudgetAllocation,
    FundingSource,
    FundingTransaction,
    PurchaseOrder,
    Bill,
    BillItem,
    BillPayment,
    BankTransfer,
    Expense,
    Payment,
)

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "project", "account_type", "balance", "is_active")
    list_filter = ("project", "account_type", "is_active")
    search_fields = ("code", "name")

class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 2

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "project", "description", "source", "is_balanced")
    list_filter = ("project", "source", "date")
    search_fields = ("description", "reference_id")
    inlines = [JournalLineInline]

@admin.register(JournalLine)
class JournalLineAdmin(admin.ModelAdmin):
    list_display = ("journal_entry", "account", "entry_type", "amount")
    list_filter = ("entry_type", "account")

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "project", "date", "supplier", "contractor", "total_amount", "status")
    list_filter = ("project", "status", "date")
    search_fields = ("po_number", "notes")

class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 1

@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ("id", "bill_number", "project", "date_issued", "due_date", "supplier", "contractor",
                    "total_amount", "amount_paid", "status")
    list_filter = ("project", "status", "date_issued", "due_date")
    search_fields = ("bill_number", "notes")
    inlines = [BillItemInline]

@admin.register(BillItem)
class BillItemAdmin(admin.ModelAdmin):
    list_display = ("bill", "description", "category", "quantity", "unit_price", "amount")
    search_fields = ("description",)

@admin.register(BillPayment)
class BillPaymentAdmin(admin.ModelAdmin):
    list_display = ("bill", "project", "account", "amount", "date", "method")
    list_filter = ("project", "method", "date", "account")

@admin.register(BankTransfer)
class BankTransferAdmin(admin.ModelAdmin):
    list_display = ("date", "project", "from_account", "to_account", "amount", "reference_id")
    list_filter = ("project", "date")

@admin.register(FundingSource)
class FundingSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "source_type", "amount", "current_balance", "received_date")
    list_filter = ("project", "source_type", "received_date")
    search_fields = ("name", "notes")

@admin.register(FundingTransaction)
class FundingTransactionAdmin(admin.ModelAdmin):
    list_display = ("funding_source", "amount", "transaction_type", "date", "description")
    list_filter = ("transaction_type", "date", "funding_source")
    search_fields = ("description",)

@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "allocation", "total_spent")
    list_filter = ("project",)
    search_fields = ("name",)

@admin.register(PhaseBudgetAllocation)
class PhaseBudgetAllocationAdmin(admin.ModelAdmin):
    list_display = ("category", "phase", "amount")
    list_filter = ("category__project", "category", "phase")

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "amount", "expense_type", "category", "date", "paid_to", "is_paid")
    list_filter = ("project", "expense_type", "category", "is_paid", "date", "funding_source")
    search_fields = ("title", "paid_to", "notes")
    date_hierarchy = "date"

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("expense", "project", "amount", "date", "method", "reference_id")
    list_filter = ("project", "method", "date")
    search_fields = ("reference_id",)
