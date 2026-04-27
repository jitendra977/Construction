import logging

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

logger = logging.getLogger(__name__)
from .models import Contractor, Material, Document, MaterialTransaction, WastageAlert, WastageThreshold
from apps.accounting.models import Vendor
from .serializers import (
    ContractorSerializer, MaterialSerializer, DocumentSerializer,
    SupplierSerializer, MaterialTransactionSerializer,
    WastageAlertSerializer, WastageThresholdSerializer
)
from apps.core.mixins import ProjectScopedMixin

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = SupplierSerializer

class ContractorViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = Contractor.objects.all()
    serializer_class = ContractorSerializer
    project_field = 'project'


class MaterialViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    project_field = 'project'

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
        from apps.accounting.models import Vendor
        from rest_framework import status
        
        material = self.get_object()
        quantity = request.data.get('quantity', material.min_stock_level)
        supplier_id = request.data.get('supplier_id')
        custom_subject = request.data.get('subject')
        custom_body = request.data.get('body')
        
        # Get supplier - either from request or from material default
        if supplier_id:
            try:
                supplier = Vendor.objects.get(id=supplier_id)
            except Vendor.DoesNotExist:
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
                    logger.warning("Failed to create pending transaction: %s", tx_err)

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

    @action(detail=True, methods=['get'], url_path='wastage-summary')
    def wastage_summary(self, request, pk=None):
        """
        Returns a full wastage breakdown for a single material.
        GET /api/v1/materials/{id}/wastage-summary/
        """
        material = self.get_object()
        threshold = material.thresholds.first()
        total_delivered = float(material.quantity_purchased)
        total_wasted = float(material.total_wasted)

        if total_delivered > 0:
            wastage_pct = round((total_wasted / total_delivered) * 100, 2)
        else:
            wastage_pct = 0.0

        if threshold:
            if wastage_pct >= threshold.critical_pct:
                status_label = 'CRITICAL'
            elif wastage_pct >= threshold.warning_pct:
                status_label = 'WARNING'
            else:
                status_label = 'OK'
        else:
            status_label = 'NO_THRESHOLD'

        return Response({
            'material_id': material.id,
            'material_name': material.name,
            'unit': material.unit,
            'total_delivered': total_delivered,
            'total_wasted': total_wasted,
            'wastage_pct': wastage_pct,
            'status': status_label,
            'threshold': WastageThresholdSerializer(threshold).data if threshold else None,
        })

class MaterialTransactionViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = MaterialTransaction.objects.all().order_by('-date', '-created_at')
    serializer_class = MaterialTransactionSerializer
    project_field = 'material__project'

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

        # Attach receipt image if provided
        receipt_image = data.get('receipt_image')
        if receipt_image:
            txn.receipt_image = receipt_image
            txn.save(update_fields=['receipt_image'])

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

class DocumentViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['document_type']
    project_field = 'project'


class WastageAlertViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    Exposes:
      GET  /api/v1/wastage-alerts/           — list open alerts (?severity=CRITICAL&is_resolved=false)
      GET  /api/v1/wastage-alerts/dashboard/ — aggregated wastage stats
      PATCH /api/v1/wastage-alerts/{id}/resolve/ — mark an alert as resolved
    """
    queryset = WastageAlert.objects.select_related('material', 'threshold', 'transaction').order_by('-created_at')
    serializer_class = WastageAlertSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['severity', 'is_resolved', 'material']
    http_method_names = ['get', 'patch', 'head', 'options']
    project_field = 'material__project'

    def get_queryset(self):
        return super().get_queryset()

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        """
        Mark a specific wastage alert as resolved with an optional note.
        PATCH /api/v1/wastage-alerts/{id}/resolve/
        Body: { "resolved_note": "Accepted due to site conditions" }
        """
        alert = self.get_object()
        if alert.is_resolved:
            return Response(
                {"error": "Alert is already resolved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        alert.is_resolved = True
        alert.resolved_note = request.data.get('resolved_note', '')
        alert.save(update_fields=['is_resolved', 'resolved_note'])
        return Response({
            "success": True,
            "message": f"Alert for '{alert.material.name}' marked as resolved.",
            "alert": WastageAlertSerializer(alert).data,
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Aggregated wastage stats for dashboard widget.
        GET /api/v1/wastage-alerts/dashboard/
        """
        from django.db.models import Sum, Count, F, FloatField, ExpressionWrapper

        open_alerts = WastageAlert.objects.filter(is_resolved=False)
        open_count = open_alerts.count()
        critical_count = open_alerts.filter(severity='CRITICAL').count()
        warning_count = open_alerts.filter(severity='WARNING').count()

        # Worst material: highest wastage_pct among open alerts
        worst = open_alerts.order_by('-wastage_pct').select_related('material').first()
        worst_material = None
        if worst:
            worst_material = {
                'id': worst.material.id,
                'name': worst.material.name,
                'wastage_pct': worst.wastage_pct,
                'severity': worst.severity,
                'unit': worst.material.unit,
            }

        # Estimated cost lost across all materials with wastage
        est_cost_lost = 0.0
        for mat in Material.objects.filter(total_wasted__gt=0):
            if mat.avg_cost_per_unit:
                est_cost_lost += float(mat.total_wasted) * float(mat.avg_cost_per_unit)

        # All materials with their current wastage status
        materials_summary = []
        for mat in Material.objects.prefetch_related('thresholds').filter(quantity_purchased__gt=0):
            total_delivered = float(mat.quantity_purchased)
            total_wasted = float(mat.total_wasted)
            pct = round((total_wasted / total_delivered) * 100, 2) if total_delivered > 0 else 0.0
            threshold = mat.thresholds.first()

            if threshold:
                if pct >= threshold.critical_pct:
                    slabel = 'CRITICAL'
                elif pct >= threshold.warning_pct:
                    slabel = 'WARNING'
                else:
                    slabel = 'OK'
            else:
                slabel = 'NO_THRESHOLD'

            materials_summary.append({
                'material_id': mat.id,
                'material_name': mat.name,
                'unit': mat.unit,
                'total_delivered': total_delivered,
                'total_wasted': total_wasted,
                'wastage_pct': pct,
                'status': slabel,
                'warning_threshold': threshold.warning_pct if threshold else None,
                'critical_threshold': threshold.critical_pct if threshold else None,
                'latest_wastage_reason': mat.transactions.filter(transaction_type='WASTAGE').order_by('-date', '-id').values_list('purpose', flat=True).first() or mat.transactions.filter(transaction_type='WASTAGE').order_by('-date', '-id').values_list('notes', flat=True).first()
            })

        return Response({
            'open_count': open_count,
            'critical_count': critical_count,
            'warning_count': warning_count,
            'est_cost_lost': round(est_cost_lost, 2),
            'worst_material': worst_material,
            'materials_summary': materials_summary,
        })


class WastageThresholdViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for per-material wastage thresholds.
    GET  /api/v1/wastage-thresholds/        — list all
    POST /api/v1/wastage-thresholds/        — create
    PATCH /api/v1/wastage-thresholds/{id}/  — update
    DELETE /api/v1/wastage-thresholds/{id}/ — delete
    """
    queryset = WastageThreshold.objects.select_related('material').order_by('material__name')
    serializer_class = WastageThresholdSerializer
    http_method_names = ['get', 'post', 'patch', 'delete', 'head', 'options']
    project_field = 'material__project'

    def get_queryset(self):
        return super().get_queryset()
