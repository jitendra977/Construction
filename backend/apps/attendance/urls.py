from rest_framework.routers import DefaultRouter
from .views import AttendanceWorkerViewSet, DailyAttendanceViewSet

router = DefaultRouter()
router.register(r"workers",  AttendanceWorkerViewSet, basename="attendance-worker")
router.register(r"records",  DailyAttendanceViewSet,  basename="attendance-record")

urlpatterns = router.urls
