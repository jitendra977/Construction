from rest_framework.routers import DefaultRouter

from .views import PhotoAnalysisViewSet, TimelapseViewSet, WeeklyDigestViewSet

router = DefaultRouter()
router.register(r"analyses", PhotoAnalysisViewSet, basename="photo-analysis")
router.register(r"timelapses", TimelapseViewSet, basename="timelapse")
router.register(r"digests", WeeklyDigestViewSet, basename="weekly-digest")

urlpatterns = router.urls
