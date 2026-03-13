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
        Send an email to a selected supplier to order this material.
        Expects: { "quantity": <number>, "supplier_id": <number>, "subject": <string>, "body": <string> }
        """
        from apps.core.email_utils import send_material_order_email
        from apps.resources.models import Supplier
        from rest_framework import status
        
        material = self.get_object()
        quantity = request.data.get('quantity', material.min_stock_level)
        supplier_id = request.data.get('supplier_id')
        custom_subject = request.data.get('subject')
        custom_body = request.data.get('body')
        
        # Get supplier - either from request or from material default
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                return Response(
                    {"error": f"Supplier with ID {supplier_id} not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
        elif material.supplier:
            supplier = material.supplier
        else:
            return Response(
                {"error": "Please select a supplier or assign one to this material"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validation
        if not supplier.email:
            return Response(
                {"error": f"Supplier '{supplier.name}' has no email address"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Send email using the selected/default supplier
        try:
            # Temporarily set supplier for email template
            original_supplier = material.supplier
            material.supplier = supplier
            
            success = send_material_order_email(
                material, 
                quantity, 
                request.user.email if request.user.is_authenticated else None,
                custom_subject=custom_subject,
                custom_body=custom_body
            )
            
            # Restore original supplier
            material.supplier = original_supplier
            
            if success:
                # NEW: Create a Pending Transaction
                from .models import MaterialTransaction
                from django.utils import timezone
                
                try:
                    MaterialTransaction.objects.create(
                        material=material,
                        transaction_type='IN',
                        status='PENDING',
                        quantity=quantity,
                        unit_price=material.avg_cost_per_unit, # Default to avg cost
                        date=timezone.now().date(),
                        supplier=supplier,
                        notes=f"Order placed via email to {supplier.name}. Subject: {custom_subject or 'N/A'}",
                        create_expense=True # Will be created when status → RECEIVED
                    )
                except Exception as tx_err:
                    print(f"Failed to create pending transaction: {tx_err}")

                return Response({
                    "success": True,
                    "message": f"Order email sent to {supplier.name} ({supplier.email}). Added to Pending Orders.",
                    "supplier": supplier.name,
                    "supplier_email": supplier.email,
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

    @action(detail=False, methods=['get'])
    def dashboard_summary(self, request):
        """
        Quick inventory summary for the dashboard.
        """
        from django.db.models import Sum, F
        total_items = Material.objects.count()
        low_stock = Material.objects.filter(current_stock__lte=F('min_stock_level')).count()
        
        return Response({
            'total_items': total_items,
            'low_stock_count': low_stock,
            'recently_used': MaterialSerializer(
                Material.objects.order_by('-quantity_used')[:5], 
                many=True
            ).data
        })

class MaterialTransactionViewSet(viewsets.ModelViewSet):
    queryset = MaterialTransaction.objects.all().order_by('-date', '-created_at')
    serializer_class = MaterialTransactionSerializer

    def perform_create(self, serializer):
        from .services import ResourceService
        data = serializer.validated_data
        
        # When creating a transaction via the API, route it through ResourceService
        txn = ResourceService.process_material_transaction(
            material=data['material'],
            transaction_type=data['transaction_type'],
            quantity=data['quantity'],
            date=data['date'],
            status=data.get('status', 'RECEIVED'),
            unit_price=data.get('unit_price'),
            supplier=data.get('supplier'),
            funding_source=data.get('funding_source'),
            phase=data.get('phase'),
            purpose=data.get('purpose', ''),
            notes=data.get('notes', ''),
            create_expense=data.get('create_expense', True)
        )
        # MUST set instance so DRF can serialize the response
        serializer.instance = txn

    def perform_destroy(self, instance):
        from .services import ResourceService
        ResourceService.delete_material_transaction(instance)

    @action(detail=True, methods=['post'])
    def receive_order(self, request, pk=None):
        """
        Confirm receipt of a pending order using ResourceService.
        """
        from .services import ResourceService
        from rest_framework import status

        transaction = self.get_object()
        if transaction.status != 'PENDING':
            return Response(
                {"error": "This transaction is not in PENDING status"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # We use a non-existent method yet, I'll add it to services.py next
        try:
            ResourceService.receive_pending_transaction(
                transaction,
                new_quantity=request.data.get('quantity'),
                new_unit_price=request.data.get('unit_price')
            )
            return Response({
                "success": True,
                "message": f"Order received! Stock updated for {transaction.material.name}.",
                "new_stock": transaction.material.current_stock
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['material', 'transaction_type']

class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document_type']
