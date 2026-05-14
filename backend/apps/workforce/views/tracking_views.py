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

    def _sync_task_assignment(self, assignment):
        """
        If this WorkerAssignment references a Task, keep Task.assigned_to
        in sync with the assignment's worker.  This is the bridge that makes
        the Phase Workforce tab and the Task Detail panel show the same person.
        """
        if assignment.task_id:
            from apps.tasks.models import Task
            Task.objects.filter(pk=assignment.task_id).update(assigned_to=assignment.worker)

    def perform_create(self, serializer):
        """
        Create the assignment, then:
        1. Auto-link the worker to the project via current_project (if not set).
        2. Sync Task.assigned_to so Phase Workforce tab ↔ Task Detail are consistent.
        """
        assignment = serializer.save(assigned_by=self.request.user)
        worker = assignment.worker
        if not worker.current_project_id:
            worker.current_project = assignment.project
            worker.save(update_fields=['current_project'])
        self._sync_task_assignment(assignment)

    def perform_update(self, serializer):
        """
        On update keep Task.assigned_to in sync with the (possibly new) worker.
        """
        assignment = serializer.save()
        self._sync_task_assignment(assignment)

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
