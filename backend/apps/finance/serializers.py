from rest_framework import serializers
from .models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction, PhaseBudgetAllocation

class FundingTransactionSerializer(serializers.ModelSerializer):
    expense_id = serializers.IntegerField(source='payment.expense.id', read_only=True)

    class Meta:
        model = FundingTransaction
        fields = '__all__'

class FundingSourceSerializer(serializers.ModelSerializer):
    transactions = FundingTransactionSerializer(many=True, read_only=True)
    current_balance = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = FundingSource
        fields = '__all__'

class PaymentSerializer(serializers.ModelSerializer):
    send_receipt = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Payment
        fields = ['id', 'expense', 'funding_source', 'amount', 'date', 'method', 'reference_id', 'notes', 'proof_photo', 'send_receipt']

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    contractor_photo = serializers.ImageField(source='contractor.photo', read_only=True)
    supplier_photo = serializers.ImageField(source='supplier.photo', read_only=True)
    funding_source_name = serializers.CharField(source='funding_source.name', read_only=True)
    task_name = serializers.CharField(source='task.title', read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    material_transaction = serializers.SerializerMethodField()
    total_paid = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    status = serializers.CharField(read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'

    def get_material_transaction(self, obj):
        # Check if there are any related material transactions
        trans = obj.material_transactions.first()
        return trans.id if trans else None

class PhaseBudgetAllocationSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    
    class Meta:
        model = PhaseBudgetAllocation
        fields = '__all__'

class BudgetCategorySerializer(serializers.ModelSerializer):
    expenses = ExpenseSerializer(many=True, read_only=True)
    phase_allocations = PhaseBudgetAllocationSerializer(many=True, read_only=True)
    total_spent = serializers.SerializerMethodField()
    
    class Meta:
        model = BudgetCategory
        fields = '__all__'

    def get_total_spent(self, obj):
        return sum(expense.amount for expense in obj.expenses.filter(is_inventory_usage=False))
