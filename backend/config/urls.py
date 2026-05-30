"""
URL configuration for construction management project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.db import connection
from django.views.decorators.clickjacking import xframe_options_exempt
from django.views.static import serve
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView


def health_check(request):
    """Lightweight health-check endpoint used by Docker and deploy scripts."""
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False
    status = 200 if db_ok else 503
    return JsonResponse({"status": "ok" if db_ok else "degraded", "db": db_ok}, status=status)

from apps.accounts.views import UserViewSet, RoleViewSet, ActivityLogViewSet
from apps.attendance.views import nfc_attendance_scan  # backward-compat alias
from apps.accounts.urls import accounts_urlpatterns, worker_urlpatterns
from apps.core.views import HouseProjectViewSet, ConstructionPhaseViewSet, PhaseDocumentViewSet, RoomViewSet, FloorViewSet, UserGuideViewSet, UserGuideStepViewSet, UserGuideFAQViewSet, UserGuideSectionViewSet, EmailLogViewSet, DashboardDataView, ProjectMemberViewSet, ProjectRoleViewSet
from apps.core.gallery_views import GalleryViewSet
from apps.tasks.views import TaskViewSet, TaskUpdateViewSet, TaskMediaViewSet

# ── Legacy resources API — backward-compat URL paths mapped to new resource app ──
from apps.resource.views.labor import WorkerViewSet as ContractorViewSet
from apps.resource.views.material import MaterialViewSet
from apps.resource.views.supplier import SupplierViewSet
from apps.permits.views import PermitDocumentViewSet as DocumentViewSet
from apps.resource.views.wastage import WastageAlertViewSet, WastageThresholdViewSet
from apps.resource.views.transactions import MaterialTransactionViewSet as NewMaterialTransactionViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'roles', RoleViewSet)
router.register(r'activity-logs', ActivityLogViewSet)
router.register(r'projects', HouseProjectViewSet, basename='project')
router.register(r'phases', ConstructionPhaseViewSet)
router.register(r'phase-documents', PhaseDocumentViewSet)
router.register(r'floors', FloorViewSet, basename='floor')
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'tasks', TaskViewSet)
router.register(r'updates', TaskUpdateViewSet)
router.register(r'task-media', TaskMediaViewSet)
router.register(r'contractors', ContractorViewSet, basename='contractor')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'materials', MaterialViewSet, basename='material')
router.register(r'documents', DocumentViewSet, basename='document')
router.register(r'gallery', GalleryViewSet, basename='gallery')
router.register(r'wastage-alerts', WastageAlertViewSet, basename='wastage-alerts')
router.register(r'wastage-thresholds', WastageThresholdViewSet, basename='wastage-thresholds')
router.register(r'user-guides', UserGuideViewSet)
router.register(r'user-guide-steps', UserGuideStepViewSet)
router.register(r'user-guide-faqs', UserGuideFAQViewSet)
router.register(r'user-guide-sections', UserGuideSectionViewSet)
router.register(r'email-logs', EmailLogViewSet)
router.register(r'project-members', ProjectMemberViewSet, basename='project-member')
router.register(r'project-roles', ProjectRoleViewSet, basename='project-role')

urlpatterns = [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    path('api/v1/health/', health_check, name='health-check'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.accounts.urls')),      # Auth endpoints (legacy)
    path('api/v1/accounts/', include(accounts_urlpatterns)),  # Accounts module
    path('api/v1/worker/',   include(worker_urlpatterns)),    # Worker portal (phone+PIN + profile)
    path('api/v1/worker/',   include('apps.worker.urls')),   # Worker portal (tasks, photos, resources)
    path('api/v1/dashboard/combined/', DashboardDataView.as_view(), name='dashboard-combined'),
    path('api/v1/', include(router.urls)),       # Main API
    # ── DEPRECATED legacy modules — kept alive so old clients don't 500,
    #    but new code should use /fin/, /resource/, and /estimate/ instead.
    #    These will be removed in Phase 3 once all clients are migrated.
    path('api/v1/finance/', include('apps.finance.urls')),      # legacy → use /fin/

    path('api/v1/permits/', include('apps.permits.urls')),
    path('api/v1/photo-intel/', include('apps.photo_intel.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
    path('api/v1/assistant/', include('apps.assistant.urls')),

    # ── Finance Module (clean separate implementation) ──────────────────────
    path('api/v1/financials/', include('apps.financials.urls')),

    # ── Resource Module ──────────────────────────────────────────────────────
    path('api/v1/resource/', include('apps.resource.urls')),
    path('api/v1/material-transactions/', NewMaterialTransactionViewSet.as_view(), name='material-transactions'),

    # ── Data Transfer (import / export) ──────────────────────────────────────
    path('api/v1/data-transfer/', include('apps.data_transfer.urls')),

    # ── Advanced Estimator ────────────────────────────────────────────────────
    path('api/v1/estimate/', include('apps.estimate.urls')),

    # ── Attendance ────────────────────────────────────────────────────────────
    path('api/v1/attendance/', include('apps.attendance.urls')),
    # Backward-compat alias: old SW/build cached the URL without the /attendance/ prefix
    path('api/v1/nfc-attendance/', nfc_attendance_scan, name='nfc-attendance-compat'),

    # ── Workforce (includes /workforce/teams/) ────────────────────────────────
    path('api/v1/workforce/', include('apps.workforce.urls')),

    # ── Location Tracking ─────────────────────────────────────────────────────
    path('api/v1/location/', include('apps.location_tracking.urls')),

    # ── Biometrics Face Authentication ────────────────────────────────────────
    path('api/v1/biometrics/', include('apps.biometrics.urls')),

    # ── Auto Backup System ────────────────────────────────────────────────────
    path('api/v1/backup/', include('apps.backup.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += [
        path('media/<path:path>', xframe_options_exempt(serve), {'document_root': settings.MEDIA_ROOT}),
    ]
