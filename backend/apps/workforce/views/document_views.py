from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WorkerDocument, WorkerContract
from ..serializers import WorkerDocumentSerializer, WorkerContractSerializer

class WorkerDocumentViewSet(viewsets.ModelViewSet):
    queryset = WorkerDocument.objects.all()
    serializer_class = WorkerDocumentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker', 'doc_type', 'verify_status']
    search_fields = ['doc_number', 'issuing_authority']
    ordering_fields = ['expiry_date', 'created_at']

class WorkerContractViewSet(viewsets.ModelViewSet):
    queryset = WorkerContract.objects.all()
    serializer_class = WorkerContractSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker', 'contract_type', 'status', 'project']
    search_fields = ['terms_notes']
    ordering_fields = ['start_date', 'end_date']
