from django.contrib import admin
from .models.account  import Account
from .models.journal  import JournalEntry, JournalLine
from .models.transfer import CashTransfer
from .models.loan     import LoanDisbursement, LoanEMIPayment
from .models.bill     import Bill, BillItem, BillPayment
from .models.budget   import BudgetCategory, BudgetAllocation


class JournalLineInline(admin.TabularInline):
    model  = JournalLine
    extra  = 0
    fields = ["account", "entry_type", "amount", "note"]


class BillItemInline(admin.TabularInline):
    model  = BillItem
    extra  = 0


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display  = ["code", "name", "account_type", "is_bank", "is_loan", "is_active"]
    list_filter   = ["account_type", "is_bank", "is_loan", "is_active"]
    search_fields = ["code", "name"]


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display  = ["date", "description", "source_type", "source_ref", "project"]
    list_filter   = ["source_type"]
    inlines       = [JournalLineInline]


@admin.register(CashTransfer)
class CashTransferAdmin(admin.ModelAdmin):
    list_display  = ["date", "from_account", "to_account", "amount", "reference"]


@admin.register(LoanDisbursement)
class LoanDisbursementAdmin(admin.ModelAdmin):
    list_display  = ["date", "loan_account", "bank_account", "amount"]


@admin.register(LoanEMIPayment)
class LoanEMIPaymentAdmin(admin.ModelAdmin):
    list_display  = ["date", "loan_account", "bank_account", "total_emi", "principal_amount", "interest_amount"]


@admin.register(Bill)
class BillAdmin(admin.ModelAdmin):
    list_display  = ["date", "vendor_name", "invoice_number", "total_amount", "payment_status"]
    list_filter   = []
    inlines       = [BillItemInline]


@admin.register(BillPayment)
class BillPaymentAdmin(admin.ModelAdmin):
    list_display  = ["date", "bill", "bank_account", "amount"]


@admin.register(BudgetCategory)
class BudgetCategoryAdmin(admin.ModelAdmin):
    list_display  = ["name", "project"]


@admin.register(BudgetAllocation)
class BudgetAllocationAdmin(admin.ModelAdmin):
    list_display  = ["category", "phase", "allocated_amount"]
