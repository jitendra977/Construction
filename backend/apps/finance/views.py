from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from apps.core.models import HouseProject, ConstructionPhase
from .models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction, PhaseBudgetAllocation
from .serializers import BudgetCategorySerializer, ExpenseSerializer, PaymentSerializer, FundingSourceSerializer, FundingTransactionSerializer, PhaseBudgetAllocationSerializer
from .services import FinanceService

class FundingSourceViewSet(viewsets.ModelViewSet):
    queryset = FundingSource.objects.all()
    serializer_class = FundingSourceSerializer

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

    def create(self, request, *args, **kwargs):
        print(f"DEBUG: Creating expense with data: {request.data}")
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(f"DEBUG: Validation failed: {serializer.errors}")
        return super().create(request, *args, **kwargs)

    def perform_update(self, serializer):
        print(f"DEBUG: Updating expense with data: {serializer.initial_data}")
        if not serializer.is_valid():
            print(f"DEBUG: Validation failed (update): {serializer.errors}")
        super().perform_update(serializer)

    @action(detail=False, methods=['get'])
    def overview(self, request):
        """
        Aggregated financial statistics for the dashboard.
        """
        from django.db.models import Count, Q
        
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
        expense_agg = Expense.objects.aggregate(
            total=Sum('amount'),
            count=Count('id')
        )
        total_spent = expense_agg['total'] or 0
        expense_count = expense_agg['count'] or 0
        
        # 4. Aggregated Breakdowns (Fixed to avoid double-counting)
        # Category breakdown: Only count actual purchases (not internal usage)
        category_breakdown = BudgetCategory.objects.annotate(
            spent=Sum('expenses__amount', filter=Q(expenses__is_inventory_usage=False))
        ).values('id', 'name', 'allocation', 'spent')
        
        # Phase breakdown: Count all costs assigned to phase (Direct + Usage)
        phase_breakdown = ConstructionPhase.objects.annotate(
            spent=Sum('expenses__amount')
        ).values('id', 'name', 'estimated_budget', 'spent')

        # 5. Summary Totals
        cat_allocation = BudgetCategory.objects.aggregate(total=Sum('allocation'))['total'] or 0
        phase_estimate = ConstructionPhase.objects.aggregate(total=Sum('estimated_budget'))['total'] or 0

        # Formatting for frontend ease
        cat_list = [
            {
                'id': c['id'], 
                'name': c['name'], 
                'allocation': float(c['allocation']), 
                'spent': float(c['spent'] or 0),
                'variance': float(c['allocation'] - (c['spent'] or 0))
            } for c in category_breakdown
        ]
        
        phase_list = [
            {
                'id': p['id'], 
                'name': p['name'], 
                'estimate': float(p['estimated_budget']), 
                'spent': float(p['spent'] or 0),
                'variance': float(p['estimated_budget'] - (p['spent'] or 0))
            } for p in phase_breakdown
        ]

        # 6. Granular Allocation Variance (Category X in Phase Y)
        # This checks if we are over-spending a specific category's allocation within a phase
        allocations = PhaseBudgetAllocation.objects.select_related('category', 'phase').all()
        allocation_analytics = []
        for alloc in allocations:
            # How much have we spent for this specific cat in this specific phase?
            spent = Expense.objects.filter(
                category=alloc.category, 
                phase=alloc.phase
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            allocation_analytics.append({
                'category_name': alloc.category.name,
                'phase_name': alloc.phase.name,
                'planned': float(alloc.amount),
                'actual': float(spent),
                'variance': float(alloc.amount - spent),
                'is_over': spent > alloc.amount
            })
        
        return Response({
            'project_budget': float(total_project_budget),
            'total_funding': float(total_funding),
            'funding_balance': float(current_funding_balance),
            'total_spent': float(total_spent),
            'expense_count': expense_count,
            'category_breakdown': cat_list,
            'phase_breakdown': phase_list,
            'allocation_analytics': allocation_analytics,
            
            # Simplified lists for Planning vs Tracking components
            'estimated_by_category': [
                {
                    'category_id': c['id'],
                    'category_name': c['name'], 
                    'planned': float(c['allocation']),
                    'actual': float(c['spent']),
                    'variance': float(c['variance'])
                } for c in cat_list
            ],
            'estimated_by_phase': [
                {
                    'phase_id': p['id'],
                    'phase_name': p['name'], 
                    'planned': float(p['estimate']),
                    'actual': float(p['spent']),
                    'variance': float(p['variance'])
                } for p in phase_list
            ],
            
            'total_category_allocation': float(cat_allocation),
            'total_phase_allocation': float(phase_estimate),
            'budget_health': project.budget_health if project else None
        })

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        FinanceService.process_payment(
            expense=data['expense'],
            amount=data['amount'],
            date=data['date'],
            method=data['method'],
            funding_source=data.get('funding_source'),
            reference_id=data.get('reference_id', ''),
            notes=data.get('notes', ''),
            proof_photo=data.get('proof_photo')
        )

    def perform_update(self, serializer):
        payment = self.get_object()
        data = serializer.validated_data
        FinanceService.update_payment(
            payment,
            amount=data.get('amount', payment.amount),
            date=data.get('date', payment.date),
            method=data.get('method', payment.method),
            funding_source=data.get('funding_source', payment.funding_source),
            reference_id=data.get('reference_id', payment.reference_id),
            notes=data.get('notes', payment.notes),
            proof_photo=data.get('proof_photo', payment.proof_photo)
        )

    def perform_destroy(self, instance):
        FinanceService.delete_payment(instance)

    @action(detail=True, methods=['post'], url_path='email-receipt')
    def email_receipt(self, request, pk=None):
        """
        Send a payment receipt email with PDF to the associated supplier or contractor.
        """
        payment = self.get_object()
        
        recipient = payment.expense.supplier or payment.expense.contractor
        if not recipient:
            return Response(
                {"error": "This payment's expense does not have a supplier or contractor assigned."},
                status=400
            )
            
        if not recipient.email:
            return Response(
                {"error": f"The recipient ({recipient.name}) does not have an email address configured."},
                status=400
            )
            
        custom_subject = request.data.get('subject')
        custom_message = request.data.get('message')
        user_email = request.user.email if hasattr(request.user, 'email') else None

        from apps.core.email_utils import send_payment_receipt_email
        succ = send_payment_receipt_email(
            payment=payment,
            user_email=user_email,
            custom_subject=custom_subject,
            custom_message=custom_message
        )

        if succ:
            return Response({"status": "Email sent successfully."})
        else:
            return Response({"error": "Failed to send email. Check logs for details."}, status=500)

class FundingTransactionViewSet(viewsets.ModelViewSet):
    queryset = FundingTransaction.objects.all()
    serializer_class = FundingTransactionSerializer

class PhaseBudgetAllocationViewSet(viewsets.ModelViewSet):
    queryset = PhaseBudgetAllocation.objects.all()
    serializer_class = PhaseBudgetAllocationSerializer
