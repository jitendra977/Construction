"""
MaterialViewSet — CRUD + stock_in / stock_out actions.
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models.material import Material
from ..serializers.material import MaterialSerializer
from ..services.stock import StockService


class MaterialViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialSerializer

    def get_queryset(self):
        qs = Material.objects.all().order_by("name")
        pid = self.request.query_params.get("project")
        if pid:
            qs = qs.filter(project_id=pid)
        return qs

    # ── POST /{id}/stock-in/ ─────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="stock-in")
    def stock_in(self, request, pk=None):
        material = self.get_object()
        qty      = request.data.get("qty") or request.data.get("quantity")
        ref      = request.data.get("reference", "")
        price    = request.data.get("unit_price", material.unit_price)

        if qty is None:
            return Response({"error": "qty is required."}, status=400)
        try:
            qty   = Decimal(str(qty))
            price = Decimal(str(price))
            assert qty > 0
        except (InvalidOperation, AssertionError):
            return Response({"error": "qty must be a positive number."}, status=400)

        try:
            with transaction.atomic():
                StockService.add_stock(
                    material=material,
                    quantity=qty,
                    unit_price=price,
                    reference=ref,
                    project=material.project,
                )
            material.refresh_from_db()
            return Response(MaterialSerializer(material).data)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)

    # ── POST /{id}/stock-out/ ────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="stock-out")
    def stock_out(self, request, pk=None):
        material = self.get_object()
        qty      = request.data.get("qty") or request.data.get("quantity")
        ref      = request.data.get("reference", "")

        if qty is None:
            return Response({"error": "qty is required."}, status=400)
        try:
            qty = Decimal(str(qty))
            assert qty > 0
        except (InvalidOperation, AssertionError):
            return Response({"error": "qty must be a positive number."}, status=400)

        try:
            with transaction.atomic():
                StockService.remove_stock(
                    material=material,
                    quantity=qty,
                    reference=ref,
                    project=material.project,
                )
            material.refresh_from_db()
            return Response(MaterialSerializer(material).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
