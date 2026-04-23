from rest_framework import serializers
from .models.ledger import Account, JournalEntry, JournalLine
from .models.treasury import BankAccount, CapitalSource, CashTransfer
from .models.payables import Vendor, PurchaseOrder, VendorBill, BillPayment
from .models.budget import PhaseBudgetLine, BudgetRevision
from .models.construction import ContractorPaymentRequest, RetentionRelease

# ─── LEDGER ──────────────────────────────────────────────────────────────────

class AccountSerializer(serializers.ModelSerializer):
    balance = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    class Meta:
        model = Account
        fields = ['id', 'code', 'name', 'account_type', 'is_active', 'balance', 'created_at', 'updated_at']

class JournalLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    class Meta:
        model = JournalLine
        fields = ['id', 'account', 'account_name', 'entry_type', 'amount', 'project', 'phase']

class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalLineSerializer(many=True, read_only=True)
    class Meta:
        model = JournalEntry
        fields = ['id', 'date', 'description', 'source_document', 'created_by', 'created_at', 'lines']

# ─── TREASURY ─────────────────────────────────────────────────────────────────

class BankAccountSerializer(serializers.ModelSerializer):
    gl_account_name = serializers.CharField(source='gl_account.name', read_only=True)
    balance = serializers.DecimalField(source='gl_account.balance', max_digits=15, decimal_places=2, read_only=True)
    class Meta:
        model = BankAccount
        fields = ['id', 'project', 'name', 'account_number', 'gl_account', 'gl_account_name', 'balance', 'is_active']

class CapitalSourceSerializer(serializers.ModelSerializer):
    gl_account_name = serializers.CharField(source='gl_account.name', read_only=True)
    balance = serializers.DecimalField(source='gl_account.balance', max_digits=15, decimal_places=2, read_only=True)
    class Meta:
        model = CapitalSource
        fields = ['id', 'name', 'source_type', 'gl_account', 'gl_account_name', 'budgeted_amount', 'balance', 'created_at']

class CashTransferSerializer(serializers.ModelSerializer):
    from_bank_name = serializers.CharField(source='from_bank.name', read_only=True)
    to_bank_name = serializers.CharField(source='to_bank.name', read_only=True)
    class Meta:
        model = CashTransfer
        fields = ['id', 'date', 'from_bank', 'from_bank_name', 'to_bank', 'to_bank_name', 'amount', 'reference', 'created_at']

# ─── PAYABLES ─────────────────────────────────────────────────────────────────

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'name', 'phone', 'address', 'pan_number', 'category', 'is_active']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    class Meta:
        model = PurchaseOrder
        fields = ['id', 'vendor', 'vendor_name', 'date', 'description', 'total_amount', 'project', 'phase', 'notes']

class VendorBillSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    expense_account_name = serializers.CharField(source='expense_account.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    # Computed payment fields from model properties
    paid_amount = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    outstanding = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    class Meta:
        model = VendorBill
        fields = [
            'id', 'vendor', 'vendor_name', 'date', 'due_date', 'invoice_number',
            'description', 'amount', 'paid_amount', 'outstanding', 'payment_status', 'is_overdue',
            'expense_account', 'expense_account_name', 'project', 'phase', 'phase_name',
        ]

class BillPaymentSerializer(serializers.ModelSerializer):
    bill_invoice = serializers.CharField(source='bill.invoice_number', read_only=True)
    bill_description = serializers.CharField(source='bill.description', read_only=True)
    bank_account_name = serializers.CharField(source='bank_account.name', read_only=True)
    class Meta:
        model = BillPayment
        fields = ['id', 'bill', 'bill_invoice', 'bill_description', 'date', 'bank_account', 'bank_account_name', 'amount', 'reference', 'notes']

# ─── BUDGET ───────────────────────────────────────────────────────────────────

class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    class Meta:
        model = PhaseBudgetLine
        fields = ['id', 'project', 'phase', 'phase_name', 'budgeted_amount', 'created_at', 'updated_at']

class BudgetRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetRevision
        fields = ['id', 'budget_line', 'date', 'previous_amount', 'new_amount', 'reason', 'created_by']

# ─── CONSTRUCTION ─────────────────────────────────────────────────────────────

class ContractorPaymentRequestSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    class Meta:
        model = ContractorPaymentRequest
        fields = [
            'id', 'project', 'phase', 'phase_name', 'contractor', 'contractor_name',
            'date_submitted', 'description', 'work_completion_percentage',
            'claimed_amount', 'retention_amount', 'net_payable', 'status',
            'approved_by', 'approved_date', 'vendor_bill',
        ]

class RetentionReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetentionRelease
        fields = ['id', 'payment_request', 'date', 'amount', 'notes', 'vendor_bill']

# ─── BUDGET SERIALIZERS ────────────────────────────────────────────

class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = PhaseBudgetLine
        fields = ['id', 'project', 'phase', 'phase_name', 'budgeted_amount', 'created_at', 'updated_at']


class BudgetRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetRevision
        fields = ['id', 'budget_line', 'date', 'previous_amount', 'new_amount', 'reason', 'created_by']


# ─── CONSTRUCTION SERIALIZERS ────────────────────────────────────────

class ContractorPaymentRequestSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = ContractorPaymentRequest
        fields = ['id', 'project', 'phase', 'phase_name', 'contractor', 'contractor_name', 'date_submitted', 'description', 'work_completion_percentage', 'claimed_amount', 'retention_amount', 'net_payable', 'status', 'approved_by', 'approved_date', 'vendor_bill']

class RetentionReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetentionRelease
        fields = ['id', 'payment_request', 'date', 'amount', 'notes', 'vendor_bill']

# ─── BUDGET SERIALIZERS ────────────────────────────────────────────

class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = PhaseBudgetLine
        fields = ['id', 'project', 'phase', 'phase_name', 'budgeted_amount', 'created_at', 'updated_at']


class BudgetRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetRevision
        fields = ['id', 'budget_line', 'date', 'previous_amount', 'new_amount', 'reason', 'created_by']


# ─── CONSTRUCTION SERIALIZERS ────────────────────────────────────────

class ContractorPaymentRequestSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = ContractorPaymentRequest
        fields = ['id', 'project', 'phase', 'phase_name', 'contractor', 'contractor_name', 'date_submitted', 'description', 'work_completion_percentage', 'claimed_amount', 'retention_amount', 'net_payable', 'status', 'approved_by', 'approved_date', 'vendor_bill']

class RetentionReleaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = RetentionRelease
        fields = ['id', 'payment_request', 'date', 'amount', 'notes', 'vendor_bill']

# ─── BUDGET SERIALIZERS ────────────────────────────────────────────

class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = PhaseBudgetLine
        fields = ['id', 'project', 'phase', 'phase_name', 'budgeted_amount', 'created_at', 'updated_at']


class BudgetRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetRevision
        fields = ['id', 'budget_line', 'date', 'previous_amount', 'new_amount', 'reason', 'created_by']


# ─── CONSTRUCTION SERIALIZERS ────────────────────────────────────────

class ContractorPaymentRequestSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = ContractorPaymentRequest
        fields = ['id', 'project', 'phase', 'phase_name', 'contractor', 'contractor_name', 'date_submitted', 'description', 'work_completion_percentage', 'claimed_amount', 'retention_amount', 'net_payable', 'status', 'approved_by', 'approved_date', 'vendor_bill']

class RetentionReleaseSerializer(serializers.ModelSerializer):  
    class Meta:
        model = RetentionRelease
        fields = ['id', 'payment_request', 'date', 'amount', 'notes', 'vendor_bill']

# ─── BUDGET SERIALIZERS ────────────────────────────────────────────

class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = PhaseBudgetLine
        fields = ['id', 'project', 'phase', 'phase_name', 'budgeted_amount', 'created_at', 'updated_at']


class BudgetRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetRevision
        fields = ['id', 'budget_line', 'date', 'previous_amount', 'new_amount', 'reason', 'created_by']


# ─── CONSTRUCTION SERIALIZERS ────────────────────────────────────────

class ContractorPaymentRequestSerializer(serializers.ModelSerializer):
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    
    class Meta:
        model = ContractorPaymentRequest
        fields = ['id', 'project', 'phase', 'phase_name', 'contractor', 'contractor_name', 'date_submitted', 'description', 'work_completion_percentage', 'claimed_amount', 'retention_amount', 'net_payable', 'status', 'approved_by', 'approved_date', 'vendor_bill']

class RetentionReleaseSerializer(serializers.ModelSerializer):              
    class Meta:
        model = RetentionRelease
        fields = ['id', 'payment_request', 'date', 'amount', 'notes', 'vendor_bill']
