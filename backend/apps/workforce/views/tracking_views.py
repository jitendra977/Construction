from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WorkerAssignment, WorkerEvaluation, SafetyRecord, PerformanceLog, EmergencyContact
from ..serializers import (
    WorkerAssignmentSerializer, WorkerEvaluationSerializer, 
    SafetyRecordSerializer, PerformanceLogSerializer, EmergencyContactSerializer
)

class WorkerAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WorkerAssignment.objects.select_related('worker', 'project', 'phase', 'task').all()
    serializer_class = WorkerAssignmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'phase', 'status']
    ordering_fields = ['start_date', 'end_date']

    def perform_create(self, serializer):
        """
        Create the assignment, then auto-link the worker to the project
        by setting current_project if it is not already set.
        This is the unified hook that keeps Workforce ↔ Project Team
        ↔ Phase Workers ↔ Task Assignment all in sync.
        """
        assignment = serializer.save(assigned_by=self.request.user)
        worker = assignment.worker
        if not worker.current_project_id:
            worker.current_project = assignment.project
            worker.save(update_fields=['current_project'])

class WorkerEvaluationViewSet(viewsets.ModelViewSet):
    queryset = WorkerEvaluation.objects.all()
    serializer_class = WorkerEvaluationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'evaluator', 'project']
    ordering_fields = ['eval_date']

class SafetyRecordViewSet(viewsets.ModelViewSet):
    queryset = SafetyRecord.objects.all()
    serializer_class = SafetyRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'incident_type', 'severity', 'status']
    search_fields = ['description', 'location']
    ordering_fields = ['incident_date', 'severity']

class PerformanceLogViewSet(viewsets.ModelViewSet):
    queryset = PerformanceLog.objects.all()
    serializer_class = PerformanceLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'category', 'rating']
    ordering_fields = ['log_date', 'rating']

class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['worker', 'is_primary']
