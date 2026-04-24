"""
Finance Module — URL Configuration
Base prefix: /api/v1/fin/

All endpoints
─────────────
GET/POST        /fin/accounts/
GET/PATCH/DEL   /fin/accounts/{id}/
POST            /fin/accounts/{id}/deposit/          ← add opening balance
POST            /fin/accounts/{id}/pay-emi/           ← pay loan EMI

GET/POST        /fin/journal-entries/
GET             /fin/journal-entries/{id}/

GET/POST        /fin/transfers/

GET/POST        /fin/loan-disbursements/
GET/POST        /fin/loan-emi-payments/

GET/POST        /fin/bills/
GET/PATCH       /fin/bills/{id}/
POST            /fin/bills/{id}/pay/                  ← shortcut pay

GET/POST        /fin/bill-payments/

GET/POST        /fin/budget-categories/
GET/POST        /fin/budget-allocations/

GET             /fin/dashboard/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    JournalEntryViewSet,
    CashTransferViewSet,
    LoanDisbursementViewSet, LoanEMIPaymentViewSet,
    BillViewSet, BillPaymentViewSet,
    BudgetCategoryViewSet, BudgetAllocationViewSet,
    FinanceDashboardView,
)

router = DefaultRouter()
router.register(r"accounts",           AccountViewSet,           basename="fin-account")
router.register(r"journal-entries",    JournalEntryViewSet,      basename="fin-journal")
router.register(r"transfers",          CashTransferViewSet,      basename="fin-transfer")
router.register(r"loan-disbursements", LoanDisbursementViewSet,  basename="fin-disbursement")
router.register(r"loan-emi-payments",  LoanEMIPaymentViewSet,    basename="fin-emi")
router.register(r"bills",              BillViewSet,              basename="fin-bill")
router.register(r"bill-payments",      BillPaymentViewSet,       basename="fin-bill-payment")
router.register(r"budget-categories",  BudgetCategoryViewSet,    basename="fin-budget-cat")
router.register(r"budget-allocations", BudgetAllocationViewSet,  basename="fin-budget-alloc")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", FinanceDashboardView.as_view(), name="fin-dashboard"),
]
