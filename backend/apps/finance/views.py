from rest_framework import viewsets
from .models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction
from .serializers import BudgetCategorySerializer, ExpenseSerializer, PaymentSerializer, FundingSourceSerializer, FundingTransactionSerializer

class FundingSourceViewSet(viewsets.ModelViewSet):
    queryset = FundingSource.objects.all()
    serializer_class = FundingSourceSerializer

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

class FundingTransactionViewSet(viewsets.ModelViewSet):
    queryset = FundingTransaction.objects.all()
    serializer_class = FundingTransactionSerializer
