"""
URL configuration for construction management project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from apps.accounts.views import UserViewSet
from apps.core.views import HouseProjectViewSet, ConstructionPhaseViewSet, RoomViewSet, FloorViewSet, DashboardDataView
from apps.core.gallery_views import GalleryViewSet
from apps.tasks.views import TaskViewSet, TaskUpdateViewSet, TaskMediaViewSet
from apps.finance.views import BudgetCategoryViewSet, ExpenseViewSet, PaymentViewSet, FundingSourceViewSet, FundingTransactionViewSet
from apps.resources.views import ContractorViewSet, MaterialViewSet, DocumentViewSet, SupplierViewSet, MaterialTransactionViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'projects', HouseProjectViewSet)
router.register(r'phases', ConstructionPhaseViewSet)
router.register(r'floors', FloorViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'updates', TaskUpdateViewSet)
router.register(r'task-media', TaskMediaViewSet)
router.register(r'budget-categories', BudgetCategoryViewSet)
router.register(r'expenses', ExpenseViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'funding-sources', FundingSourceViewSet)
router.register(r'funding-transactions', FundingTransactionViewSet)
router.register(r'contractors', ContractorViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'materials', MaterialViewSet)
router.register(r'material-transactions', MaterialTransactionViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'gallery', GalleryViewSet, basename='gallery')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')), # Auth endpoints
    path('api/v1/dashboard/combined/', DashboardDataView.as_view(), name='dashboard-combined'),
    path('api/v1/', include(router.urls)),       # Main API
    path('api/v1/estimator/', include('apps.estimator.urls')),
    path('api/v1/permits/', include('apps.permits.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
