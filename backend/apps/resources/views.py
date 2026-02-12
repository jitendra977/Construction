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
    
    @action(detail=True, methods=['post'])
    def email_supplier(self, request, pk=None):
        """
        Send an email to the supplier to order this material.
        Expects: { "quantity": <number> }
        """
        from apps.core.email_utils import send_material_order_email
        from rest_framework import status
        
        material = self.get_object()
        quantity = request.data.get('quantity', material.min_stock_level)
        
        # Validation
        if not material.supplier:
            return Response(
                {"error": "This material has no supplier assigned"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not material.supplier.email:
            return Response(
                {"error": f"Supplier '{material.supplier.name}' has no email address"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send email
        try:
            success = send_material_order_email(material, quantity, request.user.email)
            if success:
                return Response({
                    "success": True,
                    "message": f"Order email sent to {material.supplier.name} ({material.supplier.email})",
                    "supplier": material.supplier.name,
                    "supplier_email": material.supplier.email,
                    "material": material.name,
                    "quantity": quantity
                })
            else:
                return Response(
                    {"error": "Failed to send email. Please check email configuration."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


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
