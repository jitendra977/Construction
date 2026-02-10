from rest_framework import serializers
from .models import BudgetCategory, Expense, Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    phase_name = serializers.CharField(source='phase.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    contractor_name = serializers.CharField(source='contractor.name', read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = '__all__'

class BudgetCategorySerializer(serializers.ModelSerializer):
    expenses = ExpenseSerializer(many=True, read_only=True)
    total_spent = serializers.SerializerMethodField()
    
    class Meta:
        model = BudgetCategory
        fields = '__all__'

    def get_total_spent(self, obj):
        return sum(expense.amount for expense in obj.expenses.all())
