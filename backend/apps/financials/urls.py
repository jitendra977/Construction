"""
Finance Module — URL Configuration
Base prefix: /api/v1/financials/

All endpoints
─────────────
GET/POST        /financials/accounts/
GET/PATCH/DEL   /financials/accounts/{id}/
POST            /financials/accounts/{id}/deposit/
POST            /financials/accounts/{id}/pay-emi/

GET/POST        /financials/journal-entries/
GET             /financials/journal-entries/{id}/

GET/POST        /financials/transfers/

GET/POST        /financials/loan-disbursements/
GET/POST        /financials/loan-emi-payments/

GET/POST        /financials/bills/
GET/PATCH       /financials/bills/{id}/
POST            /financials/bills/{id}/pay/

GET/POST        /financials/bill-payments/

GET/POST        /financials/budget-categories/
GET/POST        /financials/budget-allocations/

GET/POST        /financials/vendors/
GET/PATCH/DEL   /financials/vendors/{id}/

GET/POST        /financials/phase-budgets/
GET/PATCH/DEL   /financials/phase-budgets/{id}/
GET             /financials/phase-budgets/variance/

GET             /financials/budget-revisions/

GET/POST        /financials/expenses/
GET/PATCH/DEL   /financials/expenses/{id}/

GET/POST        /financials/contractor-contracts/
GET/POST        /financials/contractor-installments/
GET/POST        /financials/installment-payments/

GET             /financials/dashboard/
GET             /financials/reports/
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
    ContractorContractViewSet, ContractorInstallmentViewSet,
    InstallmentPaymentViewSet,
    ExpenseViewSet,
    VendorViewSet,
    PhaseBudgetLineViewSet, BudgetRevisionViewSet,
    FinanceReportsView,
)

router = DefaultRouter()
router.register(r"accounts",                AccountViewSet,               basename="fin-account")
router.register(r"journal-entries",         JournalEntryViewSet,          basename="fin-journal")
router.register(r"transfers",               CashTransferViewSet,          basename="fin-transfer")
router.register(r"loan-disbursements",      LoanDisbursementViewSet,      basename="fin-disbursement")
router.register(r"loan-emi-payments",       LoanEMIPaymentViewSet,        basename="fin-emi")
router.register(r"bills",                   BillViewSet,                  basename="fin-bill")
router.register(r"bill-payments",           BillPaymentViewSet,           basename="fin-bill-payment")
router.register(r"budget-categories",       BudgetCategoryViewSet,        basename="fin-budget-cat")
router.register(r"budget-allocations",      BudgetAllocationViewSet,      basename="fin-budget-alloc")
router.register(r"contractor-contracts",    ContractorContractViewSet,    basename="fin-contractor")
router.register(r"contractor-installments", ContractorInstallmentViewSet, basename="fin-installment")
router.register(r"installment-payments",    InstallmentPaymentViewSet,    basename="fin-inst-payment")
router.register(r"expenses",               ExpenseViewSet,               basename="fin-expense")
router.register(r"vendors",                VendorViewSet,                basename="fin-vendor")
router.register(r"phase-budgets",          PhaseBudgetLineViewSet,       basename="fin-phase-budget")
router.register(r"budget-revisions",       BudgetRevisionViewSet,        basename="fin-budget-rev")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", FinanceDashboardView.as_view(), name="fin-dashboard"),
    path("reports/",   FinanceReportsView.as_view(),   name="fin-reports"),
]
