from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AttendanceWorkerViewSet, DailyAttendanceViewSet, qr_scan

router = DefaultRouter()
router.register(r"workers",  AttendanceWorkerViewSet, basename="attendance-worker")
router.register(r"records",  DailyAttendanceViewSet,  basename="attendance-record")

urlpatterns = router.urls + [
    # QR scan — AllowAny, used by kiosk/tablet without user login
    path("qr-scan/", qr_scan, name="attendance-qr-scan"),
]
