from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet, JournalEntryViewSet,
    BankAccountViewSet, CapitalSourceViewSet, CashTransferViewSet,
    VendorViewSet, PurchaseOrderViewSet, VendorBillViewSet, BillPaymentViewSet,
    PhaseBudgetViewSet, ContractorPaymentRequestViewSet, RetentionReleaseViewSet,
    ReportsAPIView, SummaryAPIView,
)

router = DefaultRouter()
router.register(r'accounts', AccountViewSet)
router.register(r'journal-entries', JournalEntryViewSet)
router.register(r'banks', BankAccountViewSet)
router.register(r'capital-sources', CapitalSourceViewSet)
router.register(r'transfers', CashTransferViewSet)
router.register(r'vendors', VendorViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'bills', VendorBillViewSet, basename='bill')
router.register(r'payments', BillPaymentViewSet)
router.register(r'phase-budgets', PhaseBudgetViewSet, basename='phase-budget')
router.register(r'payment-requests', ContractorPaymentRequestViewSet, basename='payment-request')
router.register(r'retention-releases', RetentionReleaseViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('reports/', ReportsAPIView.as_view(), name='accounting-reports'),
    path('summary/', SummaryAPIView.as_view(), name='accounting-summary'),
]
