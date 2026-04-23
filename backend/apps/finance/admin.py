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
    list_display = ("code", "name", "account_type", "balance", "is_active")
    list_filter = ("account_type", "is_active")
    search_fields = ("code", "name")


class JournalLineInline(admin.TabularInline):
    model = JournalLine
    extra = 2


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "description", "source", "is_balanced")
    list_filter = ("source", "date")
    search_fields = ("description", "reference_id")
    inlines = [JournalLineInline]


@admin.register(JournalLine)
class JournalLineAdmin(admin.ModelAdmin):
    list_display = ("journal_entry", "account", "entry_type", "amount")
    list_filter = ("entry_type", "account")


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ("po_number", "date", "supplier", "contractor", "total_amount", "status")
    list_filter = ("status", "date")
    search_fields = ("po_number", "notes")


class BillItemInline(admin.TabularInline):
    model = BillItem
    extra = 1


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display = ("id", "bill_number", "date_issued", "due_date", "supplier", "contractor",
                    "total_amount", "amount_paid", "status")
    list_filter = ("status", "date_issued", "due_date")
    search_fields = ("bill_number", "notes")
    inlines = [BillItemInline]


@admin.register(BillItem)
class BillItemAdmin(admin.ModelAdmin):
    list_display = ("bill", "description", "category", "quantity", "unit_price", "amount")
    search_fields = ("description",)


@admin.register(BillPayment)
class BillPaymentAdmin(admin.ModelAdmin):
    list_display = ("bill", "account", "amount", "date", "method")
    list_filter = ("method", "date", "account")


@admin.register(BankTransfer)
class BankTransferAdmin(admin.ModelAdmin):
    list_display = ("date", "from_account", "to_account", "amount", "reference_id")
    list_filter = ("date",)


@admin.register(FundingSource)
class FundingSourceAdmin(admin.ModelAdmin):
    list_display = ("name", "source_type", "amount", "current_balance", "received_date")
    list_filter = ("source_type", "received_date")
    search_fields = ("name", "notes")


@admin.register(FundingTransaction)
class FundingTransactionAdmin(admin.ModelAdmin):
    list_display = ("funding_source", "amount", "transaction_type", "date", "description")
    list_filter = ("transaction_type", "date", "funding_source")
    search_fields = ("description",)


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "allocation", "total_spent")
    search_fields = ("name",)


@admin.register(PhaseBudgetAllocation)
class PhaseBudgetAllocationAdmin(admin.ModelAdmin):
    list_display = ("category", "phase", "amount")
    list_filter = ("category", "phase")


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("title", "amount", "expense_type", "category", "date", "paid_to", "is_paid")
    list_filter = ("expense_type", "category", "is_paid", "date", "funding_source")
    search_fields = ("title", "paid_to", "notes")
    date_hierarchy = "date"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("expense", "amount", "date", "method", "reference_id")
    list_filter = ("method", "date")
    search_fields = ("reference_id",)
