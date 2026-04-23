from datetime import date
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.db import models, transaction
from django.db.models import Sum, Count

from .models.ledger import Account, JournalEntry, AccountType, EntryType
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
from .services.ledger import LedgerService
from .services.budget import BudgetService
from .services.reports import ReportService
from .services.construction import ConstructionService


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _project_id(request):
    """Safely extract project_id integer from query params or request data."""
    raw = request.query_params.get('project') or request.data.get('project')
    if raw and str(raw) not in ('null', 'undefined', ''):
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None


# ─── LEDGER ──────────────────────────────────────────────────────────────────

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all().order_by('code')
    serializer_class = AccountSerializer


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        qs = JournalEntry.objects.prefetch_related('lines').order_by('-date', '-created_at')
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(lines__project_id=pid).distinct()
        return qs


# ─── TREASURY ─────────────────────────────────────────────────────────────────

class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer

    def get_queryset(self):
        qs = BankAccount.objects.select_related('gl_account', 'project').filter(is_active=True)
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    def perform_create(self, serializer):
        project_id = _project_id(self.request)
        gl_account_id = self.request.data.get('gl_account')
        if not gl_account_id:
            # Auto-generate a unique GL ASSET account code
            existing_codes = set(
                Account.objects.filter(account_type=AccountType.ASSET)
                .values_list('code', flat=True)
            )
            new_code = next(
                str(c) for c in range(1000, 2000) if str(c) not in existing_codes
            )
            gl_account = Account.objects.create(
                name=f"Bank - {serializer.validated_data.get('name', 'New')}",
                code=new_code,
                account_type=AccountType.ASSET
            )
            serializer.save(
                gl_account=gl_account,
                project_id=project_id,
                # No `created_by` on BankAccount model currently
            )
        else:
            serializer.save(project_id=project_id)

    @action(detail=True, methods=['post'], url_path='add-balance')
    def add_balance(self, request, pk=None):
        bank = self.get_object()
        amount = request.data.get('amount')
        reference = request.data.get('reference', '')

        if not amount:
            return Response({'error': 'Amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = Decimal(str(amount))
            if amount <= 0:
                raise ValueError
        except (ValueError, Exception):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        # Find or create "Opening Balance Equity" account safely
        try:
            equity_acc = Account.objects.get(name="Opening Balance Equity")
        except Account.DoesNotExist:
            existing_codes = set(
                Account.objects.filter(code__regex=r'^3\d+$').values_list('code', flat=True)
            )
            new_code = next(str(c) for c in range(3000, 4000) if str(c) not in existing_codes)
            equity_acc = Account.objects.create(
                name="Opening Balance Equity",
                code=new_code,
                account_type=AccountType.EQUITY
            )

        lines = [
            {"account_id": bank.gl_account_id, "entry_type": EntryType.DEBIT,  "amount": amount,
             "project_id": bank.project_id},
            {"account_id": equity_acc.id,       "entry_type": EntryType.CREDIT, "amount": amount,
             "project_id": bank.project_id},
        ]

        try:
            with transaction.atomic():
                je = LedgerService.post_entry(
                    date=date.today(),
                    description=f"Deposit to {bank.name}: {reference}",
                    source_document=f"DEP-{str(bank.id)[:8]}",
                    lines=lines
                )
                je.created_by = request.user
                je.save(update_fields=['created_by'])
            return Response({'status': 'success', 'message': 'Balance added successfully'})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CapitalSourceViewSet(viewsets.ModelViewSet):
    queryset = CapitalSource.objects.select_related('gl_account').all()
    serializer_class = CapitalSourceSerializer


class CashTransferViewSet(viewsets.ModelViewSet):
    serializer_class = CashTransferSerializer

    def get_queryset(self):
        qs = CashTransfer.objects.select_related('from_bank', 'to_bank').order_by('-date')
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(from_bank__project_id=pid)
        return qs

    def perform_create(self, serializer):
        transfer = serializer.save()
        TreasuryService.execute_transfer(transfer)


# ─── PAYABLES ─────────────────────────────────────────────────────────────────

class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        qs = PurchaseOrder.objects.select_related('vendor').all()
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(project_id=pid)
        return qs


class VendorBillViewSet(viewsets.ModelViewSet):
    serializer_class = VendorBillSerializer

    def get_queryset(self):
        qs = VendorBill.objects.select_related('vendor', 'expense_account', 'phase').all()
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    def perform_create(self, serializer):
        bill = serializer.save()
        PayableService.post_bill(bill)


class BillPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = BillPaymentSerializer

    def get_queryset(self):
        qs = BillPayment.objects.select_related('bill', 'bank_account').order_by('-date')
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(bill__project_id=pid)
        return qs

    def perform_create(self, serializer):
        payment = serializer.save()
        PayableService.post_payment(payment)


# ─── BUDGET ──────────────────────────────────────────────────────────────────

class PhaseBudgetViewSet(viewsets.ModelViewSet):
    serializer_class = PhaseBudgetLineSerializer

    def get_queryset(self):
        qs = PhaseBudgetLine.objects.select_related('phase', 'project').all()
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    @action(detail=False, methods=['get'], url_path='variance')
    def variance(self, request):
        pid = _project_id(request)
        if not pid:
            return Response({'error': 'project param required'}, status=400)
        data = BudgetService.get_variance(pid)
        return Response(data)


# ─── CONSTRUCTION ─────────────────────────────────────────────────────────────

class ContractorPaymentRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ContractorPaymentRequestSerializer

    def get_queryset(self):
        qs = ContractorPaymentRequest.objects.select_related(
            'contractor', 'phase', 'project'
        ).order_by('-date_submitted')
        pid = _project_id(self.request)
        if pid:
            qs = qs.filter(project_id=pid)
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
        pid = _project_id(request)

        if report_type == 'balance_sheet':
            data = ReportService.balance_sheet()
        elif report_type == 'cash_flow':
            months = int(request.query_params.get('months', 6))
            data = ReportService.cash_flow_summary(project_id=pid, months=months)
        elif report_type == 'phase_cost':
            if not pid:
                return Response({'error': 'project param required'}, status=400)
            data = ReportService.phase_cost_summary(pid)
        else:
            return Response({'error': 'Unknown report type'}, status=400)

        return Response({'type': report_type, 'data': data})


# ─── SUMMARY (Single-call dashboard feed) ─────────────────────────────────────

class SummaryAPIView(APIView):
    def get(self, request):
        pid = _project_id(request)

        # 1. Cash / bank balances — filtered by project
        banks_qs = BankAccount.objects.select_related('gl_account').filter(is_active=True)
        if pid:
            banks_qs = banks_qs.filter(project_id=pid)

        bank_data = []
        total_cash = Decimal('0')
        for b in banks_qs:
            bal = b.gl_account.balance
            total_cash += bal
            bank_data.append({
                'id': str(b.id),
                'name': b.name,
                'balance': float(bal),
                'account_number': b.account_number or '',
            })

        # 2. Payables — filtered by project
        bills_qs = VendorBill.objects.all()
        if pid:
            bills_qs = bills_qs.filter(project_id=pid)

        totals = bills_qs.aggregate(billed=Sum('amount'))
        total_billed = totals['billed'] or Decimal('0')

        all_bills = list(bills_qs)
        total_paid = sum((b.paid_amount for b in all_bills), Decimal('0'))
        total_due = sum((b.outstanding for b in all_bills), Decimal('0'))
        overdue_count = sum(1 for b in all_bills if b.is_overdue)
        overdue_amount = sum((b.outstanding for b in all_bills if b.is_overdue), Decimal('0'))

        # 3. Contractor Payment Requests — filtered by project
        pr_qs = ContractorPaymentRequest.objects.filter(status='PENDING')
        if pid:
            pr_qs = pr_qs.filter(project_id=pid)

        pr_totals = pr_qs.aggregate(count=models.Count('id'), amount=Sum('net_payable'))
        pending_count = pr_totals['count'] or 0
        pending_amount = pr_totals['amount'] or Decimal('0')

        # 4. Phase Summary — only when project is known
        phase_summary = []
        if pid:
            from .services.budget import BudgetService
            variance = BudgetService.get_variance(pid)
            phase_summary = [
                {
                    'phase_name': v['phase_name'],
                    'budgeted_amount': float(v['budgeted']),
                    'spent_amount': float(v['spent']),
                    'percent_used': float(v['percent_used']),
                }
                for v in variance[:8]  # cap at 8 for dashboard widget
            ]

        return Response({
            'project_id': pid,
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
