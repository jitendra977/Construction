from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Q
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from datetime import datetime
from apps.core.models import HouseProject, ConstructionPhase
from .models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction, PhaseBudgetAllocation
from .serializers import BudgetCategorySerializer, ExpenseSerializer, PaymentSerializer, FundingSourceSerializer, FundingTransactionSerializer, PhaseBudgetAllocationSerializer
from .filters import ExpenseFilter
from apps.core.pdf_utils import generate_payment_receipt_pdf, generate_expense_report_pdf
from .services import FinanceService

class FundingSourceViewSet(viewsets.ModelViewSet):
    queryset = FundingSource.objects.all()
    serializer_class = FundingSourceSerializer

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all()
    serializer_class = BudgetCategorySerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by('-date')
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ExpenseFilter
    search_fields = ['title', 'paid_to', 'category__name', 'phase__name']

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

    def perform_destroy(self, instance):
        # We must explicitly use FinanceService to delete payments 
        # to ensure funding sources are correctly refunded.
        for payment in instance.payments.all():
            FinanceService.delete_payment(payment)
        super().perform_destroy(instance)

    @action(detail=False, methods=['get'], url_path='export-pdf')
    def export_pdf(self, request):
        """
        Generate a filtered PDF report of expenses.
        """
        queryset = self.filter_queryset(self.get_queryset())
        
        # Build filter metadata string for the PDF header
        params = self.request.query_params
        meta = []
        if params.get('start_date'): meta.append(f"From: {params.get('start_date')}")
        if params.get('end_date'): meta.append(f"To: {params.get('end_date')}")
        
        meta_str = " | ".join(meta) if meta else "Full Project History"
        
        pdf_content = generate_expense_report_pdf(queryset, filter_metadata=meta_str)
        
        filename = f"expense_report_{datetime.now().strftime('%Y%m%d')}.pdf"
        response = HttpResponse(pdf_content, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

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
        
        # 7. Expense Type Breakdown (Material vs Labor vs Fees etc)
        type_breakdown = Expense.objects.filter(is_inventory_usage=False).values('expense_type').annotate(
            spent=Sum('amount')
        )
        type_list = {item['expense_type']: float(item['spent']) for item in type_breakdown}

        # 8. Days since first expense (for burn rate)
        first_expense = Expense.objects.filter(is_inventory_usage=False).order_by('date').first()
        days_active = 0
        if first_expense:
            from django.utils import timezone
            import datetime
            today = datetime.date.today()
            days_active = (today - first_expense.date).days + 1

        return Response({
            'project_budget': float(total_project_budget),
            'total_funding': float(total_funding),
            'funding_balance': float(current_funding_balance),
            'total_spent': float(total_spent),
            'expense_count': expense_count,
            'category_breakdown': cat_list,
            'phase_breakdown': phase_list,
            'allocation_analytics': allocation_analytics,
            'type_breakdown': type_list,
            'days_active': days_active,
            
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
        send_receipt = data.pop('send_receipt', True)

        payment = FinanceService.process_payment(
            expense=data['expense'],
            amount=data['amount'],
            date=data['date'],
            method=data['method'],
            funding_source=data.get('funding_source'),
            reference_id=data.get('reference_id', ''),
            notes=data.get('notes', ''),
            proof_photo=data.get('proof_photo')
        )

        if send_receipt:
            try:
                from apps.core.email_utils import send_payment_receipt_email
                # We call this with the request user for auditing
                send_payment_receipt_email(
                    payment=payment,
                    user=self.request.user
                )
            except Exception as e:
                print(f"Error triggering payment receipt email: {e}")

        # Update the serializer instance to point to the created payment
        # This allows DRF to return the full payment object
        serializer.instance = payment

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
        from apps.core.models import EmailLog
        
        recipient = payment.expense.supplier or payment.expense.contractor
        
        # Check for recipient early but log the failure
        if not recipient:
            paid_to = payment.expense.paid_to or 'Unknown'
            error_msg = f"Cannot send receipt: '{paid_to}' is not linked as a Supplier or Contractor model. Please edit the expense and select a Supplier/Contractor from the dropdown."
            EmailLog.objects.create(
                email_type='PAYMENT_RECEIPT',
                status='FAILED',
                recipient_name=paid_to,
                recipient_email='N/A',
                subject='[FAILED] Payment Receipt Request',
                payment=payment,
                expense=payment.expense,
                sent_by=request.user,
                error_message=error_msg
            )
            return Response({"error": error_msg}, status=400)
            
        if not recipient.email:
            error_msg = f"The recipient ({recipient.name}) does not have an email address configured. Please add an email to the Supplier/Contractor profile."
            EmailLog.objects.create(
                email_type='PAYMENT_RECEIPT',
                status='FAILED',
                recipient_name=recipient.name,
                recipient_email='N/A',
                subject='[FAILED] Payment Receipt Request',
                payment=payment,
                expense=payment.expense,
                sent_by=request.user,
                error_message=error_msg
            )
            return Response({"error": error_msg}, status=400)
            
        custom_subject = request.data.get('subject')
        custom_message = request.data.get('message')

        from apps.core.email_utils import send_payment_receipt_email
        succ = send_payment_receipt_email(
            payment=payment,
            user=request.user,
            custom_subject=custom_subject,
            custom_message=custom_message
        )

        if succ:
            return Response({"status": "Email sent successfully."})
        else:
            return Response({"error": "Failed to send email. Check your SMTP settings or your internet connection."}, status=500)

class FundingTransactionViewSet(viewsets.ModelViewSet):
    queryset = FundingTransaction.objects.all()
    serializer_class = FundingTransactionSerializer

class PhaseBudgetAllocationViewSet(viewsets.ModelViewSet):
    queryset = PhaseBudgetAllocation.objects.all()
    serializer_class = PhaseBudgetAllocationSerializer
