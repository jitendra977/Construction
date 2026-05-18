"""
MaterialViewSet — CRUD + stock_in / stock_out actions.
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models.material import Material
from ..models.supplier import Supplier
from ..models.purchase import PurchaseOrder
from ..serializers.material import MaterialSerializer
from ..services.stock import StockService

# Optional import — gracefully ignore if core app is unavailable
try:
    from apps.core.models import ConstructionPhase
except ImportError:
    ConstructionPhase = None


class MaterialViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
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
        material      = self.get_object()
        qty           = request.data.get("qty") or request.data.get("quantity")
        ref           = request.data.get("reference", "")
        notes         = request.data.get("notes", "")
        price         = request.data.get("unit_price", material.unit_price)
        supplier_id   = request.data.get("supplier")
        po_id         = request.data.get("purchase_order")

        if qty is None:
            return Response({"error": "qty is required."}, status=400)
        try:
            qty   = Decimal(str(qty))
            price = Decimal(str(price))
            assert qty > 0
        except (InvalidOperation, AssertionError):
            return Response({"error": "qty must be a positive number."}, status=400)

        # Resolve supplier (optional)
        supplier = None
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
            except Supplier.DoesNotExist:
                return Response({"error": "Supplier not found."}, status=400)

        # Resolve purchase order (optional) — must belong to same project
        purchase_order = None
        if po_id:
            try:
                purchase_order = PurchaseOrder.objects.get(
                    id=po_id, project=material.project
                )
                # Auto-fill reference from PO number if not given
                if not ref and purchase_order.order_number:
                    ref = f"PO/{purchase_order.order_number}"
                # Inherit supplier from PO if not explicitly given
                if supplier is None and purchase_order.supplier_id:
                    supplier = purchase_order.supplier
            except PurchaseOrder.DoesNotExist:
                return Response({"error": "Purchase order not found."}, status=400)

        try:
            with transaction.atomic():
                StockService.add_stock(
                    material=material,
                    quantity=qty,
                    unit_price=price,
                    reference=ref,
                    project=material.project,
                    notes=notes,
                    supplier=supplier,
                    purchase_order=purchase_order,
                )

                # ── Update PO item received_qty + auto-complete PO ────────────
                if purchase_order is not None:
                    _receive_po_item(purchase_order, material, qty)

            material.refresh_from_db()
            return Response(MaterialSerializer(material).data)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)

    # ── POST /{id}/stock-out/ ────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="stock-out")
    def stock_out(self, request, pk=None):
        material   = self.get_object()
        qty        = request.data.get("qty") or request.data.get("quantity")
        ref        = request.data.get("reference", "")
        notes      = request.data.get("notes", "")
        phase_id   = request.data.get("phase")
        unit_price = request.data.get("unit_price", material.unit_price)

        if qty is None:
            return Response({"error": "qty is required."}, status=400)
        try:
            qty = Decimal(str(qty))
            assert qty > 0
        except (InvalidOperation, AssertionError):
            return Response({"error": "qty must be a positive number."}, status=400)

        try:
            unit_price = Decimal(str(unit_price))
        except (InvalidOperation, TypeError):
            unit_price = material.unit_price or Decimal("0")

        # Resolve phase if provided
        phase = None
        if phase_id and ConstructionPhase is not None:
            try:
                phase = ConstructionPhase.objects.get(id=phase_id)
            except ConstructionPhase.DoesNotExist:
                return Response({"error": "Phase not found."}, status=400)

        try:
            with transaction.atomic():
                StockService.remove_stock(
                    material=material,
                    quantity=qty,
                    reference=ref,
                    project=material.project,
                    notes=notes,
                    phase=phase,
                )

                # ── Also create a finance.Expense so PhaseDetailPanel shows it ──
                if phase is not None:
                    _create_material_expense(
                        material=material,
                        qty=qty,
                        unit_price=unit_price,
                        phase=phase,
                        notes=notes or ref,
                    )

            material.refresh_from_db()
            return Response(MaterialSerializer(material).data)
        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)


# ── Shared helper ─────────────────────────────────────────────────────────────

def _receive_po_item(purchase_order, material, qty_received):
    """
    Update received_qty on the PO item(s) for this material,
    then auto-set the PO to RECEIVED if all items are now fully received.

    Rules:
      - Find items in this PO that match the material.
      - Add qty_received to each item's received_qty (capped at ordered qty).
      - After updating, check purchase_order.is_fully_received.
      - If fully received → set PO status to RECEIVED.
      - If PO was DRAFT, bump it to ORDERED first (then RECEIVED).
    """
    remaining = qty_received
    items = list(purchase_order.items.filter(material=material))

    if not items:
        # No matching item on this PO — still mark PO status if applicable,
        # but don't crash. The stock movement is already recorded.
        pass
    else:
        for item in items:
            if remaining <= 0:
                break
            shortfall = item.quantity - item.received_qty
            if shortfall <= 0:
                continue
            to_apply = min(remaining, shortfall)
            item.received_qty += to_apply
            item.save(update_fields=["received_qty"])
            remaining -= to_apply

    # Reload PO and check completion
    purchase_order.refresh_from_db()
    if purchase_order.is_fully_received:
        purchase_order.status = PurchaseOrder.Status.RECEIVED
        purchase_order.save(update_fields=["status"])
    elif purchase_order.status == PurchaseOrder.Status.DRAFT:
        # First delivery against a draft PO → bump to ORDERED
        purchase_order.status = PurchaseOrder.Status.ORDERED
        purchase_order.save(update_fields=["status"])


def _create_material_expense(*, material, qty, unit_price, phase, notes=""):
    """
    Create a finance.Expense(expense_type='MATERIAL') so that PhaseDetailPanel
    picks it up via its dashboardData.expenses filter.
    Non-fatal — stock movement already recorded if this fails.
    """
    try:
        from apps.finance.models import Expense
        from django.utils import timezone

        Expense.objects.create(
            title=notes or f"{material.name} — stock out",
            amount=qty * unit_price,
            expense_type="MATERIAL",
            material=material,
            quantity=qty,
            unit_price=unit_price,
            phase=phase,
            project=material.project,
            date=timezone.localdate().isoformat(),
            paid_to="Stock Allocation",
            is_inventory_usage=True,
        )
    except Exception:
        # Non-fatal
        pass
