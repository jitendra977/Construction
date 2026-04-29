from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkforceCategoryViewSet, WorkforceRoleViewSet,
    WorkforceMemberViewSet, WorkerDocumentViewSet,
    WorkerContractViewSet, SkillViewSet,
    WorkerSkillViewSet, WageStructureViewSet,
    PayrollRecordViewSet,
    WorkerAssignmentViewSet, WorkerEvaluationViewSet,
    SafetyRecordViewSet, PerformanceLogViewSet,
    EmergencyContactViewSet, TeamViewSet,
)

router = DefaultRouter()

# Categories & Roles
router.register(r'categories', WorkforceCategoryViewSet)
router.register(r'roles', WorkforceRoleViewSet)

# Core Members
router.register(r'members', WorkforceMemberViewSet)

# Documents & Contracts
router.register(r'documents', WorkerDocumentViewSet)
router.register(r'contracts', WorkerContractViewSet)

# Skills
router.register(r'skills', SkillViewSet)
router.register(r'worker-skills', WorkerSkillViewSet)

# Payroll
router.register(r'wages', WageStructureViewSet)
router.register(r'payroll-records', PayrollRecordViewSet)

# Tracking & Safety
router.register(r'assignments', WorkerAssignmentViewSet)
router.register(r'evaluations', WorkerEvaluationViewSet)
router.register(r'safety-records', SafetyRecordViewSet)
router.register(r'performance-logs', PerformanceLogViewSet)
router.register(r'emergency-contacts', EmergencyContactViewSet)

# Teams (merged from apps.teams)
router.register(r'teams', TeamViewSet, basename='team')

urlpatterns = [
    path('', include(router.urls)),
]
