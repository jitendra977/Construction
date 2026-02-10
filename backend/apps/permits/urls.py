from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermitStepViewSet, LegalDocumentViewSet

router = DefaultRouter()
router.register(r'steps', PermitStepViewSet)
router.register(r'documents', LegalDocumentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
