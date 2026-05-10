"""
PurchaseOrderViewSet, PurchaseOrderItemViewSet, StockMovementViewSet
"""
from django.db import transaction
from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ReadOnlyModelViewSet

from ..models.purchase import PurchaseOrder, PurchaseOrderItem, StockMovement
from ..serializers.purchase import (
    PurchaseOrderSerializer,
    PurchaseOrderItemSerializer,
    StockMovementSerializer,
)
from ..services.stock import StockService


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer

    def get_queryset(self):
        qs  = PurchaseOrder.objects.prefetch_related("items").all().order_by("-order_date")
        pid = self.request.query_params.get("project")
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    def perform_update(self, serializer):
        # Check if status is changing to ORDERED
        old_order = self.get_object()
        old_status = old_order.status
        
        # Save the new state
        order = serializer.save()
        
        if old_status != PurchaseOrder.Status.ORDERED and order.status == PurchaseOrder.Status.ORDERED:
            send_email = str(self.request.data.get("send_email", "true")).lower() == "true"
            if send_email:
                if not order.supplier or not order.supplier.email:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError({"detail": f"Cannot send email: Supplier '{order.supplier.name if order.supplier else 'None'}' has no email address configured. Please add an email address to the supplier first, or uncheck 'Email Supplier'."})
                
                from apps.core.email_utils import send_purchase_order_email
                try:
                    send_purchase_order_email(order, getattr(self.request, 'user', None))
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send PO email for {order.id}: {e}")

    # ── POST /{id}/receive/ ──────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        order = self.get_object()
        if order.status == PurchaseOrder.Status.CANCELLED:
            return Response({"error": "Cannot receive a cancelled order."}, status=400)
        if order.status == PurchaseOrder.Status.RECEIVED:
            return Response({"error": "Order is already fully received."}, status=400)

        try:
            with transaction.atomic():
                result = StockService.receive_purchase_order(order, receipt_data=request.data)

            order.refresh_from_db()

            # Send received confirmation email only when fully done
            if order.status == PurchaseOrder.Status.RECEIVED:
                from apps.core.email_utils import send_purchase_order_received_email
                try:
                    send_purchase_order_received_email(order, getattr(self.request, 'user', None))
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(
                        f"Failed to send received confirmation for PO {order.id}: {e}"
                    )

            response_data = PurchaseOrderSerializer(order).data
            response_data["_receipt_summary"] = result
            return Response(response_data)

        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception(f"Error receiving PO {pk}: {exc}")
            return Response({"error": str(exc)}, status=400)

    # ── GET /{id}/pdf/ ───────────────────────────────────────────────────────
    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        order = self.get_object()
        from apps.core.pdf_utils import generate_full_purchase_order_pdf
        from django.http import FileResponse
        import io
        
        pdf_content = generate_full_purchase_order_pdf(order)
        filename = f"PO_{order.order_number or order.id}.pdf"
        return FileResponse(
            io.BytesIO(pdf_content),
            as_attachment=True,
            filename=filename,
            content_type='application/pdf'
        )

    # ── POST /bulk-delete/ ───────────────────────────────────────────────────
    @action(detail=False, methods=["post"], url_path="bulk-delete")
    def bulk_delete(self, request):
        """
        Delete multiple purchase orders by ID.
        Body: { "ids": ["uuid1", "uuid2", ...] }
        """
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"error": "No IDs provided."}, status=400)

        try:
            with transaction.atomic():
                qs = PurchaseOrder.objects.filter(id__in=ids)
                count = qs.count()
                qs.delete()
            return Response({"deleted": count})
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderItemSerializer

    def get_queryset(self):
        qs    = PurchaseOrderItem.objects.all()
        order = self.request.query_params.get("order")
        if order:
            qs = qs.filter(order_id=order)
        return qs


class StockMovementViewSet(ReadOnlyModelViewSet):
    serializer_class = StockMovementSerializer

    def get_queryset(self):
        qs       = StockMovement.objects.all().order_by("-created_at")
        pid      = self.request.query_params.get("project")
        material = self.request.query_params.get("material")
        if pid:
            qs = qs.filter(project_id=pid)
        if material:
            qs = qs.filter(material_id=material)
        return qs
