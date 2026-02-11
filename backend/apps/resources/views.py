from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from .models import Contractor, Material, Document, Supplier, MaterialTransaction
from .serializers import (
    ContractorSerializer, MaterialSerializer, DocumentSerializer, 
    SupplierSerializer, MaterialTransactionSerializer
)

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer

class ContractorViewSet(viewsets.ModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer

from rest_framework.decorators import action
from rest_framework.response import Response

class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer

    @action(detail=True, methods=['post'])
    def recalculate_stock(self, request, pk=None):
        material = self.get_object()
        material.recalculate_stock()
        serializer = self.get_serializer(material)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def recalculate_all(self, request):
        materials = Material.objects.all()
        for material in materials:
            material.recalculate_stock()
        return Response({"status": "All stock levels recalculated successfully."})

class MaterialTransactionViewSet(viewsets.ModelViewSet):
    queryset = MaterialTransaction.objects.all()
    serializer_class = MaterialTransactionSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['material', 'transaction_type']

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document_type']
