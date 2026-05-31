from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import CameraHealthView, CameraViewSet

router = DefaultRouter()
router.register(r'cameras', CameraViewSet, basename='cctv-camera')

urlpatterns = [
    path('health/', CameraHealthView.as_view(), name='cctv-health'),
] + router.urls
