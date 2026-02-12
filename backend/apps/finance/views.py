from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from apps.core.models import HouseProject, ConstructionPhase
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

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Aggregated financial statistics for the dashboard.
        """
        # 1. Project-level Budget
        project = HouseProject.objects.first()
        total_project_budget = project.total_budget if project else 0
        
        # 2. Funding
        funding_agg = FundingSource.objects.aggregate(
            total=Sum('amount'),
            balance=Sum('current_balance')
        )
        total_funding = funding_agg['total'] or 0
        current_funding_balance = funding_agg['balance'] or 0
        
        # 3. Expenses
        expense_agg = Expense.objects.aggregate(total=Sum('amount'))
        total_spent = expense_agg['total'] or 0
        
        # 4. Estimates vs Allocations
        cat_allocation = BudgetCategory.objects.aggregate(total=Sum('allocation'))['total'] or 0
        phase_estimate = ConstructionPhase.objects.aggregate(total=Sum('estimated_budget'))['total'] or 0
        
        return Response({
            'project_budget': total_project_budget,
            'total_funding': total_funding,
            'funding_balance': current_funding_balance,
            'total_spent': total_spent,
            'estimated_by_category': cat_allocation,
            'estimated_by_phase': phase_estimate,
            'budget_health': project.budget_health if project else {}
        })

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

class FundingTransactionViewSet(viewsets.ModelViewSet):
    queryset = FundingTransaction.objects.all()
    serializer_class = FundingTransactionSerializer
