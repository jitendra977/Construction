from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BudgetCategoryViewSet, 
    ExpenseViewSet, 
    PaymentViewSet, 
    FundingSourceViewSet, 
    FundingTransactionViewSet, 
    PhaseBudgetAllocationViewSet, 
    AccountViewSet, 
    JournalEntryViewSet, 
    PurchaseOrderViewSet, 
    BillViewSet, 
    BillPaymentViewSet,
    BankTransferViewSet
)

router = DefaultRouter()
router.register(r'budget-categories', BudgetCategoryViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'funding-sources', FundingSourceViewSet)
router.register(r'funding-transactions', FundingTransactionViewSet)
router.register(r'phase-budget-allocations', PhaseBudgetAllocationViewSet)
router.register(r'accounts', AccountViewSet)
router.register(r'journal-entries', JournalEntryViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'bills', BillViewSet)
router.register(r'bill-payments', BillPaymentViewSet)
router.register(r'bank-transfers', BankTransferViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
