from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermitStepViewSet

router = DefaultRouter()
router.register(r'steps', PermitStepViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
