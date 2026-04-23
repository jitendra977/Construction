"""
Finance REST endpoints.

Mount point: /api/v1/finance/...
  accounts/
  journal-entries/
  purchase-orders/
  bills/                 + custom action: pay/
  bill-payments/
  bank-transfers/
  expenses/              + custom actions: export-pdf/, overview/
  payments/              + custom action: email-receipt/
  budget-categories/
  funding-sources/       + custom action: recalculate/
  funding-transactions/
  phase-budget-allocations/
"""

from __future__ import annotations

import logging
from datetime import date as _date

logger = logging.getLogger(__name__)
from decimal import Decimal

from django.db.models import Sum, Q, Count, F, DecimalField, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, filters, status as drf_status, permissions
from apps.accounts.permissions import CanManageFinances
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import HouseProject, ConstructionPhase
from apps.core.pdf_utils import generate_expense_report_pdf

from .filters import ExpenseFilter
from .models import (
    ZERO,
    Account,
    JournalEntry,
    PurchaseOrder,
    BudgetCategory,
    PhaseBudgetAllocation,
    FundingSource,
    FundingTransaction,
    Bill,
    BillPayment,
    BankTransfer,
    Expense,
    Payment,
)
from .serializers import (
    AccountSerializer,
    JournalEntrySerializer,
    PurchaseOrderSerializer,
    BudgetCategorySerializer,
    PhaseBudgetAllocationSerializer,
    FundingSourceSerializer,
    FundingTransactionSerializer,
    BillSerializer,
    BillPaymentSerializer,
    BankTransferSerializer,
    ExpenseSerializer,
    PaymentSerializer,
)
from .services import BillService, TransferService, FundingService, FinanceService


# -----------------------------------------------------------------------------
# GL
# -----------------------------------------------------------------------------

class AccountViewSet(viewsets.ModelViewSet):
    queryset = Account.objects.all().order_by("code")
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["account_type", "is_active", "project"]
    search_fields = ["name", "code"]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]


class JournalEntryViewSet(viewsets.ModelViewSet):
    queryset = JournalEntry.objects.all().prefetch_related("lines", "lines__account").order_by("-date", "-id")
    serializer_class = JournalEntrySerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["source", "project"]


# -----------------------------------------------------------------------------
# Accounts Payable
# -----------------------------------------------------------------------------

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.all().order_by("-date")
    serializer_class = PurchaseOrderSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["status", "supplier", "contractor", "project"]


class BillViewSet(viewsets.ModelViewSet):
    queryset = (
        Bill.objects.all()
        .select_related("supplier", "contractor", "journal_entry")
        .prefetch_related("items", "payments")
        .order_by("-date_issued", "-id")
    )
    serializer_class = BillSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["status", "supplier", "contractor", "project"]

    def perform_create(self, serializer):
        """Save the bill then immediately post the AP journal entry.
        Dr Expense (per item or generic)  /  Cr Accounts Payable.
        """
        bill = serializer.save()
        try:
            BillService.post_bill_ledger(bill)
        except Exception as exc:
            logger.error("Bill GL post failed for Bill %s: %s", bill.id, exc)

    def perform_update(self, serializer):
        """Re-post the ledger if bill details changed."""
        bill = serializer.save()
        try:
            BillService.sync_bill_ledger(bill)
        except Exception as exc:
            logger.error("Bill GL sync failed for Bill %s: %s", bill.id, exc)

    def perform_destroy(self, instance):
        BillService.delete_bill(instance)

    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        """One-shot payment endpoint: POST /bills/{id}/pay/ with
        {account, amount, date, method, reference_id?}."""
        bill = self.get_object()
        try:
            payment = BillService.pay_bill(
                bill,
                account=Account.objects.get(pk=request.data["account"], project=bill.project),
                amount=request.data["amount"],
                date=request.data["date"],
                method=request.data.get("method", "CASH"),
                reference_id=request.data.get("reference_id", ""),
            )
        except Account.DoesNotExist:
            return Response({"error": "Account not found."}, status=drf_status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=drf_status.HTTP_400_BAD_REQUEST)
        return Response(BillPaymentSerializer(payment).data, status=drf_status.HTTP_201_CREATED)


class BillPaymentViewSet(viewsets.ModelViewSet):
    queryset = BillPayment.objects.all().select_related("account", "bill").order_by("-date", "-id")
    serializer_class = BillPaymentSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["method", "account", "bill", "project"]

    def create(self, request, *args, **kwargs):
        """Override so we always go through the service (updates bill + posts JE)."""
        try:
            bill = Bill.objects.get(pk=request.data["bill"])
            account = Account.objects.get(pk=request.data["account"], project=bill.project)
            payment = BillService.pay_bill(
                bill,
                account=account,
                amount=request.data["amount"],
                date=request.data["date"],
                method=request.data.get("method", "CASH"),
                reference_id=request.data.get("reference_id", ""),
            )
        except (Bill.DoesNotExist, Account.DoesNotExist):
            return Response({"error": "Bill or account not found."},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        except KeyError as e:
            return Response({"error": f"Missing field: {e}"},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        return Response(self.get_serializer(payment).data, status=drf_status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        BillService.delete_bill_payment(instance)


class BankTransferViewSet(viewsets.ModelViewSet):
    queryset = BankTransfer.objects.all().select_related("from_account", "to_account").order_by("-date", "-id")
    serializer_class = BankTransferSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["from_account", "to_account", "project"]

    def perform_create(self, serializer):
        """Save the transfer then post the GL journal entry."""
        transfer = serializer.save()
        try:
            TransferService.execute(transfer)
        except Exception as exc:
            logger.error("BankTransfer GL post failed for Transfer %s: %s", transfer.id, exc)

    def perform_update(self, serializer):
        """Re-execute the transfer logic if details changed."""
        transfer = serializer.save()
        try:
            TransferService.sync(transfer)
        except Exception as exc:
            logger.error("BankTransfer GL sync failed for Transfer %s: %s", transfer.id, exc)

    def perform_destroy(self, instance):
        TransferService.delete(instance)


# -----------------------------------------------------------------------------
# Budget
# -----------------------------------------------------------------------------

class BudgetCategoryViewSet(viewsets.ModelViewSet):
    queryset = BudgetCategory.objects.all().order_by("name")
    serializer_class = BudgetCategorySerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["project"]


class PhaseBudgetAllocationViewSet(viewsets.ModelViewSet):
    queryset = PhaseBudgetAllocation.objects.all()
    serializer_class = PhaseBudgetAllocationSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]


# -----------------------------------------------------------------------------
# Funding
# -----------------------------------------------------------------------------

class FundingSourceViewSet(viewsets.ModelViewSet):
    queryset = FundingSource.objects.all().prefetch_related("transactions").order_by("-received_date")
    serializer_class = FundingSourceSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["project"]

    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        source = self.get_object()
        FundingService.sync_initial_transaction(source)
        FundingService.recalculate(source)
        return Response({
            "status": "recalculated",
            "current_balance": float(source.current_balance),
            "total_credited": float(source.total_credited),
            "total_debited": float(source.total_debited),
        })


class FundingTransactionViewSet(viewsets.ModelViewSet):
    queryset = FundingTransaction.objects.all().order_by("-date", "-id")
    serializer_class = FundingTransactionSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filterset_fields = ["transaction_type", "funding_source"]


# -----------------------------------------------------------------------------
# Expenses / Payments
# -----------------------------------------------------------------------------

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = (
        Expense.objects.all()
        .select_related("category", "phase", "supplier", "contractor", "funding_source", "task", "material")
        .prefetch_related("payments")
        .order_by("-date")
    )
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = ExpenseFilter
    search_fields = ["title", "paid_to", "category__name", "phase__name"]

    def perform_destroy(self, instance):
        for payment in instance.payments.all():
            FinanceService.delete_payment(payment)
        super().perform_destroy(instance)

    @action(detail=False, methods=["get"], url_path="export-pdf")
    def export_pdf(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        params = self.request.query_params
        meta = []
        if params.get("start_date"):
            meta.append(f"From: {params.get('start_date')}")
        if params.get("end_date"):
            meta.append(f"To: {params.get('end_date')}")
        meta_str = " | ".join(meta) if meta else "Full Project History"

        pdf_content = generate_expense_report_pdf(queryset, filter_metadata=meta_str)
        filename = f"expense_report_{_date.today().isoformat()}.pdf"
        response = HttpResponse(pdf_content, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    @action(detail=False, methods=["get"])
    def overview(self, request):
        """Aggregated finance dashboard payload. Safe against empty data."""
        project_id = request.query_params.get("project_id")
        if project_id:
            project = HouseProject.objects.filter(pk=project_id).first()
        else:
            project = HouseProject.objects.first()
            
        project_budget = _float(project.total_budget if project else 0)

        # Base filter for related objects
        p_filter = {"project": project} if project else {}

        # Funding summary
        funding_agg = FundingSource.objects.filter(**p_filter).aggregate(
            total=Sum("amount"),
            balance=Sum("current_balance"),
        )
        total_funding = _float(funding_agg["total"])
        funding_balance = _float(funding_agg["balance"])

        # Expenses summary (direct-spend flow)
        expense_agg = Expense.objects.filter(is_inventory_usage=False, **p_filter).aggregate(
            total=Sum("amount"),
            count=Count("id"),
        )
        total_spent = _float(expense_agg["total"])
        expense_count = expense_agg["count"] or 0

        # Accounts Payable from Bills — use DB fields (NOT the balance_due property)
        bills_qs = Bill.objects.filter(status__in=["UNPAID", "PARTIAL"], **p_filter)
        ap_agg = bills_qs.aggregate(
            total_liability=Coalesce(Sum("total_amount"), Value(0, output_field=DecimalField())),
            total_paid=Coalesce(Sum("amount_paid"), Value(0, output_field=DecimalField())),
        )
        total_accounts_payable = _float(ap_agg["total_liability"] - ap_agg["total_paid"])

        # GL balances by account type
        account_type_balances = {}
        bank_cash_details = []
        for acc in Account.objects.filter(is_active=True, **p_filter):
            atype = acc.account_type
            bal = float(acc.balance)
            account_type_balances[atype] = account_type_balances.get(atype, 0.0) + bal
            if atype == "ASSET":
                bank_cash_details.append({
                    "id": acc.id,
                    "name": acc.name,
                    "code": acc.code,
                    "balance": bal,
                })

        # Category burn — unified (both Expense and Bill contribute)
        categories = BudgetCategory.objects.filter(**p_filter)
        category_breakdown = []
        for cat in categories:
            spent = float(cat.total_spent)
            allocation = float(cat.allocation or 0)
            category_breakdown.append({
                "id": cat.id,
                "name": cat.name,
                "allocation": allocation,
                "spent": spent,
                "variance": allocation - spent,
            })

        # Phase breakdown — from Expense only (bills don't always link to phase)
        phase_breakdown = []
        for p in ConstructionPhase.objects.all():
            spent_agg = p.expenses.filter(is_inventory_usage=False).aggregate(t=Sum("amount"))
            spent = float(spent_agg["t"] or 0)
            est = float(p.estimated_budget or 0)
            phase_breakdown.append({
                "id": p.id,
                "name": p.name,
                "estimate": est,
                "spent": spent,
                "variance": est - spent,
            })

        cat_allocation = float(BudgetCategory.objects.aggregate(t=Sum("allocation"))["t"] or 0)
        phase_estimate = float(ConstructionPhase.objects.aggregate(t=Sum("estimated_budget"))["t"] or 0)

        first_expense = Expense.objects.filter(is_inventory_usage=False).order_by("date").first()
        days_active = 0
        if first_expense:
            days_active = (_date.today() - first_expense.date).days + 1

        return Response({
            "project_budget": project_budget,
            "total_funding": total_funding,
            "funding_balance": funding_balance,
            "total_spent": total_spent,
            "expense_count": expense_count,
            "total_accounts_payable": total_accounts_payable,
            "account_balances": account_type_balances,
            "bank_cash_details": bank_cash_details,
            "category_breakdown": category_breakdown,
            "phase_breakdown": phase_breakdown,
            "days_active": days_active,
            "total_category_allocation": cat_allocation,
            "total_phase_allocation": phase_estimate,
            "budget_health": getattr(project, "budget_health", None) if project else None,
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().select_related("expense", "funding_source").order_by("-date", "-id")
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated, CanManageFinances]

    def perform_create(self, serializer):
        data = serializer.validated_data
        send_receipt = data.pop("send_receipt", True)

        payment = FinanceService.process_payment(
            expense=data["expense"],
            amount=data["amount"],
            date=data["date"],
            method=data["method"],
            funding_source=data.get("funding_source"),
            reference_id=data.get("reference_id", ""),
            notes=data.get("notes", ""),
            proof_photo=data.get("proof_photo"),
        )

        if send_receipt:
            try:
                from apps.core.email_utils import send_payment_receipt_email
                send_payment_receipt_email(payment=payment, user=self.request.user)
            except Exception as e:
                logger.error("Error triggering payment receipt email: %s", e)

        serializer.instance = payment

    def perform_update(self, serializer):
        payment = self.get_object()
        data = serializer.validated_data
        FinanceService.update_payment(
            payment,
            amount=data.get("amount", payment.amount),
            date=data.get("date", payment.date),
            method=data.get("method", payment.method),
            funding_source=data.get("funding_source", payment.funding_source),
            reference_id=data.get("reference_id", payment.reference_id),
            notes=data.get("notes", payment.notes),
            proof_photo=data.get("proof_photo", payment.proof_photo),
        )

    def perform_destroy(self, instance):
        FinanceService.delete_payment(instance)

    @action(detail=True, methods=["post"], url_path="email-receipt")
    def email_receipt(self, request, pk=None):
        """Send a PDF receipt for this payment to the linked supplier/contractor."""
        payment = self.get_object()
        from apps.core.models import EmailLog

        recipient = payment.expense.supplier or payment.expense.contractor
        if not recipient:
            msg = (
                f"Cannot send receipt: '{payment.expense.paid_to}' isn't linked as a "
                "Supplier or Contractor. Edit the expense and select one from the dropdown."
            )
            EmailLog.objects.create(
                email_type="PAYMENT_RECEIPT", status="FAILED",
                recipient_name=payment.expense.paid_to or "Unknown",
                recipient_email="N/A",
                subject="[FAILED] Payment Receipt Request",
                payment=payment, expense=payment.expense,
                sent_by=request.user, error_message=msg,
            )
            return Response({"error": msg}, status=400)

        if not recipient.email:
            msg = (
                f"The recipient ({recipient.name}) has no email on file. "
                "Add one to their Supplier/Contractor profile."
            )
            EmailLog.objects.create(
                email_type="PAYMENT_RECEIPT", status="FAILED",
                recipient_name=recipient.name, recipient_email="N/A",
                subject="[FAILED] Payment Receipt Request",
                payment=payment, expense=payment.expense,
                sent_by=request.user, error_message=msg,
            )
            return Response({"error": msg}, status=400)

        from apps.core.email_utils import send_payment_receipt_email
        success = send_payment_receipt_email(
            payment=payment,
            user=request.user,
            custom_subject=request.data.get("subject"),
            custom_message=request.data.get("message"),
        )
        if success:
            return Response({"status": "Email sent successfully."})
        return Response({"error": "Failed to send email. Check SMTP settings."}, status=500)


# -----------------------------------------------------------------------------
# helpers
# -----------------------------------------------------------------------------

def _float(x) -> float:
    if x is None:
        return 0.0
    if isinstance(x, Decimal):
        return float(x)
    try:
        return float(x)
    except (TypeError, ValueError):
        return 0.0
