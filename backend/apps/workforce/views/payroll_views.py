from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WageStructure, PayrollRecord
from ..serializers import WageStructureSerializer, PayrollRecordSerializer

class WageStructureViewSet(viewsets.ModelViewSet):
    queryset = WageStructure.objects.all()
    serializer_class = WageStructureSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['worker']

class PayrollRecordViewSet(viewsets.ModelViewSet):
    queryset = PayrollRecord.objects.all()
    serializer_class = PayrollRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'worker', 'project']
    search_fields = ['payment_reference', 'deduction_notes']
    ordering_fields = ['period_start', 'period_end', 'status']
