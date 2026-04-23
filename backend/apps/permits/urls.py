from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PermitStepViewSet
from .copilot_views import (
    ChecklistItemViewSet,
    DeadlineReminderViewSet,
    DocumentTemplateViewSet,
    MunicipalityTemplateViewSet,
    PermitChecklistViewSet,
)

router = DefaultRouter()
router.register(r'steps', PermitStepViewSet)
router.register(r'municipality-templates', MunicipalityTemplateViewSet, basename='municipality-template')
router.register(r'document-templates', DocumentTemplateViewSet, basename='document-template')
router.register(r'checklists', PermitChecklistViewSet, basename='permit-checklist')
router.register(r'checklist-items', ChecklistItemViewSet, basename='checklist-item')
router.register(r'reminders', DeadlineReminderViewSet, basename='deadline-reminder')

urlpatterns = [
    path('', include(router.urls)),
]
