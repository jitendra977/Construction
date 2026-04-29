from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WorkerAssignment, WorkerEvaluation, SafetyRecord, PerformanceLog, EmergencyContact
from ..serializers import (
    WorkerAssignmentSerializer, WorkerEvaluationSerializer, 
    SafetyRecordSerializer, PerformanceLogSerializer, EmergencyContactSerializer
)

class WorkerAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WorkerAssignment.objects.all()
    serializer_class = WorkerAssignmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'phase', 'status']
    ordering_fields = ['start_date', 'end_date']

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
