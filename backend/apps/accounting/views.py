from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.db import models
from django.db.models import Sum, Count

from .models.ledger import Account, JournalEntry
from .models.treasury import BankAccount, CapitalSource, CashTransfer
from .models.payables import Vendor, PurchaseOrder, VendorBill, BillPayment
from .models.budget import PhaseBudgetLine
from .models.construction import ContractorPaymentRequest, RetentionRelease

from .serializers import (
    AccountSerializer, JournalEntrySerializer,
    BankAccountSerializer, CapitalSourceSerializer, CashTransferSerializer,
    VendorSerializer, PurchaseOrderSerializer, VendorBillSerializer, BillPaymentSerializer,
    PhaseBudgetLineSerializer, BudgetRevisionSerializer,
    ContractorPaymentRequestSerializer, RetentionReleaseSerializer,
)

from .services.treasury import TreasuryService
from .services.payables import PayableService
from .services.budget import BudgetService
from .services.reports import ReportService
from .services.construction import ConstructionService


# ─── LEDGER ──────────────────────────────────────────────────────────────────

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = JournalEntry.objects.prefetch_related('lines').order_by('-date', '-created_at')
    serializer_class = JournalEntrySerializer


# ─── TREASURY ─────────────────────────────────────────────────────────────────

class BankAccountViewSet(viewsets.ModelViewSet):
    queryset = BankAccount.objects.select_related('gl_account').all()
    serializer_class = BankAccountSerializer

class CapitalSourceViewSet(viewsets.ModelViewSet):
    queryset = CapitalSource.objects.select_related('gl_account').all()
    serializer_class = CapitalSourceSerializer

class CashTransferViewSet(viewsets.ModelViewSet):
    queryset = CashTransfer.objects.select_related('from_bank', 'to_bank').order_by('-date')
    serializer_class = CashTransferSerializer

    def perform_create(self, serializer):
        transfer = serializer.save()
        TreasuryService.execute_transfer(transfer)


# ─── PAYABLES ─────────────────────────────────────────────────────────────────

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related('vendor').all()
    serializer_class = PurchaseOrderSerializer

class VendorBillViewSet(viewsets.ModelViewSet):
    serializer_class = VendorBillSerializer

    def get_queryset(self):
        qs = VendorBill.objects.select_related('vendor', 'expense_account', 'phase').all()
        project_id = self.request.query_params.get('project')
        if project_id and project_id not in ('null', 'undefined', ''):
            qs = qs.filter(project_id=project_id)
        return qs

    def perform_create(self, serializer):
        bill = serializer.save()
        PayableService.post_bill(bill)

class BillPaymentViewSet(viewsets.ModelViewSet):
    queryset = BillPayment.objects.select_related('bill', 'bank_account').order_by('-date')
    serializer_class = BillPaymentSerializer

    def perform_create(self, serializer):
        payment = serializer.save()
        PayableService.post_payment(payment)


# ─── BUDGET ──────────────────────────────────────────────────────────────────

class PhaseBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = PhaseBudgetLineSerializer

    def get_queryset(self):
        qs = PhaseBudgetLine.objects.select_related('phase', 'project').all()
        project_id = self.request.query_params.get('project')
        if project_id and project_id not in ('null', 'undefined', ''):
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=['get'], url_path='variance')
    def variance(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project param required'}, status=400)
        data = BudgetService.get_variance(project_id)
        return Response(data)


# ─── CONSTRUCTION ─────────────────────────────────────────────────────────────

class ContractorPaymentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ContractorPaymentRequestSerializer

    def get_queryset(self):
        qs = ContractorPaymentRequest.objects.select_related('contractor', 'phase', 'project').order_by('-date_submitted')
        project_id = self.request.query_params.get('project')
        if project_id and project_id not in ('null', 'undefined', ''):
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        try:
            req = ConstructionService.approve_payment_request(pk, request.user)
            return Response(ContractorPaymentRequestSerializer(req).data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)

class RetentionReleaseViewSet(viewsets.ModelViewSet):
    queryset = RetentionRelease.objects.all()
    serializer_class = RetentionReleaseSerializer


# ─── REPORTS ─────────────────────────────────────────────────────────────────

class ReportsAPIView(APIView):
    def get(self, request):
        report_type = request.query_params.get('type', 'balance_sheet')
        project_id = request.query_params.get('project')

        if report_type == 'balance_sheet':
            data = ReportService.balance_sheet()
        elif report_type == 'cash_flow':
            months = int(request.query_params.get('months', 6))
            data = ReportService.cash_flow_summary(project_id=project_id, months=months)
        elif report_type == 'phase_cost':
            if not project_id:
                return Response({'error': 'project param required'}, status=400)
            data = ReportService.phase_cost_summary(project_id)
        else:
            return Response({'error': 'Unknown report type'}, status=400)

        return Response({'type': report_type, 'data': data})


# ─── SUMMARY (Single-call dashboard feed) ─────────────────────────────────────

class SummaryAPIView(APIView):
    def get(self, request):
        project_id_raw = request.query_params.get('project')
        project_id = None
        
        # Robust project_id parsing
        if project_id_raw and project_id_raw not in ('null', 'undefined', ''):
            try:
                project_id = int(project_id_raw)
            except (ValueError, TypeError):
                pass

        # 1. Cash / bank balances (Global or Project-specific if banks were linked to projects)
        # Currently banks are global in our model.
        banks = BankAccount.objects.select_related('gl_account').all()
        bank_data = []
        total_cash = Decimal('0')
        for b in banks:
            bal = b.gl_account.balance
            total_cash += bal
            bank_data.append({
                'id': str(b.id),
                'name': b.name,
                'balance': float(bal)
            })

        # 2. Payables (Filter by project if provided)
        bills_qs = VendorBill.objects.all()
        if project_id:
            bills_qs = bills_qs.filter(project_id=project_id)
        
        # Aggregate totals to avoid N+1 and property overhead in summary
        totals = bills_qs.aggregate(
            billed=Sum('amount'),
            # Note: paid_amount is a property, so we can't sum it in SQL easily here.
            # However, for a small number of bills, we can sum properties.
        )
        total_billed = totals['billed'] or Decimal('0')
        
        # Calculate paid and due by iterating (fine for summary counts)
        all_bills = list(bills_qs)
        total_paid = sum((b.paid_amount for b in all_bills), Decimal('0'))
        total_due = sum((b.outstanding for b in all_bills), Decimal('0'))
        overdue_count = sum(1 for b in all_bills if b.is_overdue)
        overdue_amount = sum((b.outstanding for b in all_bills if b.is_overdue), Decimal('0'))

        # 3. Contractor Payment Requests (Filter by project)
        pr_qs = ContractorPaymentRequest.objects.filter(status='PENDING')
        if project_id:
            pr_qs = pr_qs.filter(project_id=project_id)
            
        pr_totals = pr_qs.aggregate(count=models.Count('id'), amount=Sum('net_payable'))
        pending_count = pr_totals['count'] or 0
        pending_amount = pr_totals['amount'] or Decimal('0')

        # 4. Phase Summary
        phase_summary = []
        if project_id:
            budgets = PhaseBudgetLine.objects.filter(project_id=project_id).select_related('phase').order_by('phase__order')[:8]
            # Get spent per phase for these specific phases
            phase_ids = [b.phase_id for b in budgets]
            phase_spend = bills_qs.filter(phase_id__in=phase_ids).values('phase_id').annotate(total=Sum('amount'))
            spend_map = {item['phase_id']: item['total'] for item in phase_spend}
            
            for b in budgets:
                phase_summary.append({
                    'phase_name': b.phase.name,
                    'budgeted_amount': float(b.budgeted_amount),
                    'spent_amount': float(spend_map.get(b.phase_id, 0)),
                })

        return Response({
            'project_id': project_id,
            'cash': {'total_cash': float(total_cash), 'bank_accounts': bank_data},
            'payables': {
                'total_billed': float(total_billed),
                'total_paid': float(total_paid),
                'total_due': float(total_due),
                'overdue_count': overdue_count,
                'overdue_amount': float(overdue_amount),
            },
            'payment_requests': {
                'pending_count': pending_count,
                'pending_amount': float(pending_amount),
            },
            'phase_summary': phase_summary,
        })
