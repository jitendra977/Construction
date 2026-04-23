"""
URL configuration for construction management project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter

from apps.accounts.views import UserViewSet, RoleViewSet, ActivityLogViewSet
from apps.core.views import HouseProjectViewSet, ConstructionPhaseViewSet, RoomViewSet, FloorViewSet, UserGuideViewSet, UserGuideStepViewSet, UserGuideFAQViewSet, EmailLogViewSet, DashboardDataView
from apps.core.import_views import SqlImportView, RawDataPopulationView
from apps.core.gallery_views import GalleryViewSet
from apps.tasks.views import TaskViewSet, TaskUpdateViewSet, TaskMediaViewSet

from apps.resources.views import ContractorViewSet, MaterialViewSet, DocumentViewSet, SupplierViewSet, MaterialTransactionViewSet, WastageAlertViewSet, WastageThresholdViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'activity-logs', ActivityLogViewSet)
router.register(r'projects', HouseProjectViewSet, basename='project')
router.register(r'phases', ConstructionPhaseViewSet)
router.register(r'floors', FloorViewSet)
router.register(r'rooms', RoomViewSet)
router.register(r'tasks', TaskViewSet)
router.register(r'updates', TaskUpdateViewSet)
router.register(r'task-media', TaskMediaViewSet)
router.register(r'contractors', ContractorViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'materials', MaterialViewSet)
router.register(r'material-transactions', MaterialTransactionViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'gallery', GalleryViewSet, basename='gallery')
router.register(r'wastage-alerts', WastageAlertViewSet, basename='wastage-alerts')
router.register(r'wastage-thresholds', WastageThresholdViewSet, basename='wastage-thresholds')
router.register(r'user-guides', UserGuideViewSet)
router.register(r'user-guide-steps', UserGuideStepViewSet)
router.register(r'user-guide-faqs', UserGuideFAQViewSet)
router.register(r'email-logs', EmailLogViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')), # Auth endpoints
    path('api/v1/dashboard/combined/', DashboardDataView.as_view(), name='dashboard-combined'),
    path('api/v1/import/sql/', SqlImportView.as_view(), name='sql-import'),
    path('api/v1/import/populate-raw-data/', RawDataPopulationView.as_view(), name='populate-raw-data'),
    path('api/v1/', include(router.urls)),       # Main API
    path('api/v1/finance/', include('apps.finance.urls')),
    path('api/v1/accounting/', include('apps.accounting.urls')),
    path('api/v1/estimator/', include('apps.estimator.urls')),
    path('api/v1/permits/', include('apps.permits.urls')),
    path('api/v1/photo-intel/', include('apps.photo_intel.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/assistant/', include('apps.assistant.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
