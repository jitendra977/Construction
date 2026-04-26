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

    # ── POST /{id}/receive/ ──────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="receive")
    def receive(self, request, pk=None):
        order = self.get_object()
        if order.status == PurchaseOrder.Status.CANCELLED:
            return Response({"error": "Cannot receive a cancelled order."}, status=400)
        if order.status == PurchaseOrder.Status.RECEIVED:
            return Response({"error": "Order already fully received."}, status=400)

        try:
            with transaction.atomic():
                StockService.receive_purchase_order(order)
            order.refresh_from_db()
            return Response(PurchaseOrderSerializer(order).data)
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
