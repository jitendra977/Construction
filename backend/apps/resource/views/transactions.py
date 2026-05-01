"""
MaterialTransactionViewSet — wraps StockService for the legacy
`/api/v1/material-transactions/` endpoint used by PhaseDetailPanel.

Accepts the same payload the frontend already sends:
  {
    material:        "<uuid>",
    transaction_type: "IN" | "OUT" | "WASTAGE",
    quantity:        <number>,
    unit_price:      <number>,
    date:            "YYYY-MM-DD",
    phase:           <phase_id>,
    purpose:         "<string>",
    create_expense:  true | false,
    status:          "RECEIVED",
  }
"""
from decimal import Decimal, InvalidOperation

from django.db import transaction as db_transaction
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models.material import Material
from ..services.stock import StockService


class MaterialTransactionViewSet(APIView):
    """
    POST /api/v1/material-transactions/
    Allocate (stock-out) or receive (stock-in) a material and optionally
    record a finance Expense for phase cost tracking.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        data = request.data

        # ── 1. Resolve material ──────────────────────────────────────────────
        material_id = data.get("material")
        if not material_id:
            return Response({"error": "material is required."}, status=400)

        try:
            material = Material.objects.get(pk=material_id)
        except Material.DoesNotExist:
            return Response({"error": f"Material '{material_id}' not found."}, status=400)

        # ── 2. Parse quantity & unit_price ───────────────────────────────────
        try:
            qty = Decimal(str(data.get("quantity", 0)))
            assert qty > 0
        except (InvalidOperation, AssertionError):
            return Response({"error": "quantity must be a positive number."}, status=400)

        try:
            unit_price = Decimal(str(data.get("unit_price") or material.unit_price or 0))
        except InvalidOperation:
            unit_price = material.unit_price or Decimal("0")

        # ── 3. Build reference string ────────────────────────────────────────
        purpose = data.get("purpose", "")
        phase_id = data.get("phase")
        reference = purpose or (f"Phase {phase_id}" if phase_id else "Manual")

        # ── 4. Execute stock movement ────────────────────────────────────────
        txn_type = (data.get("transaction_type") or "OUT").upper()

        try:
            with db_transaction.atomic():
                if txn_type == "IN":
                    movement = StockService.add_stock(
                        material=material,
                        quantity=qty,
                        unit_price=unit_price,
                        reference=reference,
                        project=material.project,
                    )
                else:
                    # OUT or WASTAGE — deduct stock
                    movement = StockService.remove_stock(
                        material=material,
                        quantity=qty,
                        reference=reference,
                        project=material.project,
                    )

                # ── 5. Optionally create Finance Expense ─────────────────────
                if data.get("create_expense", True) and txn_type in ("OUT", "WASTAGE"):
                    self._create_expense(
                        material=material,
                        qty=qty,
                        unit_price=unit_price,
                        phase_id=phase_id,
                        purpose=purpose,
                        date=data.get("date"),
                        project=material.project,
                        user=request.user,
                    )

        except ValueError as exc:
            return Response({"error": str(exc)}, status=400)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)

        material.refresh_from_db()
        return Response({
            "id": str(movement.id),
            "material": str(material.id),
            "material_name": material.name,
            "stock_qty": str(material.stock_qty),
            "movement_type": movement.movement_type,
            "quantity": str(movement.quantity),
            "unit_price": str(movement.unit_price or unit_price),
            "reference": movement.reference,
        }, status=status.HTTP_201_CREATED)

    # ── helpers ──────────────────────────────────────────────────────────────

    def _create_expense(self, *, material, qty, unit_price, phase_id, purpose,
                        date, project, user):
        """Create a finance.Expense linked to the phase (optional)."""
        try:
            from apps.finance.models import Expense
            from django.utils import timezone

            phase = None
            if phase_id:
                from apps.core.models import ConstructionPhase
                try:
                    phase = ConstructionPhase.objects.get(pk=phase_id)
                except ConstructionPhase.DoesNotExist:
                    pass

            Expense.objects.create(
                title=purpose or f"{material.name} allocation",
                amount=qty * unit_price,
                expense_type="MATERIAL",
                material=material,
                quantity=qty,
                unit_price=unit_price,
                phase=phase,
                project=project or (phase.project if phase else None),
                date=date or timezone.localdate().isoformat(),
                paid_to="Stock Allocation",
                is_inventory_usage=True,
            )
        except Exception:
            # Non-fatal — stock movement already recorded
            pass
