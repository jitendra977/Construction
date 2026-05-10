"""
StockService — manage material stock levels and purchase order receipt.
"""
from decimal import Decimal, InvalidOperation
from django.db import transaction

from ..models.material import Material
from ..models.purchase import StockMovement, PurchaseOrder


class StockService:

    @staticmethod
    @transaction.atomic
    def add_stock(material: Material, quantity: Decimal, unit_price: Decimal,
                  reference: str, project, notes: str = "",
                  supplier=None, purchase_order=None,
                  vehicle_number="", delivered_by="", document_ref="") -> StockMovement:
        """Create a StockMovement(IN) and increase material.stock_qty."""
        movement = StockMovement.objects.create(
            project=project,
            material=material,
            movement_type=StockMovement.MovementType.IN,
            quantity=quantity,
            unit_price=unit_price,
            reference=reference,
            notes=notes,
            supplier=supplier,
            purchase_order=purchase_order,
            vehicle_number=vehicle_number or "",
            delivered_by=delivered_by or "",
            document_ref=document_ref or "",
        )
        material.stock_qty += quantity
        material.save(update_fields=["stock_qty"])
        return movement

    @staticmethod
    @transaction.atomic
    def remove_stock(material: Material, quantity: Decimal, reference: str,
                     project, notes: str = "", phase=None) -> StockMovement:
        """Create a StockMovement(OUT) and decrease material.stock_qty."""
        if material.stock_qty < quantity:
            raise ValueError(
                f"Insufficient stock for '{material.name}'. "
                f"Available: {material.stock_qty}, Requested: {quantity}"
            )
        movement = StockMovement.objects.create(
            project=project,
            material=material,
            phase=phase,
            movement_type=StockMovement.MovementType.OUT,
            quantity=quantity,
            unit_price=None,
            reference=reference,
            notes=notes,
        )
        material.stock_qty -= quantity
        material.save(update_fields=["stock_qty"])
        return movement

    @staticmethod
    @transaction.atomic
    def receive_purchase_order(order: PurchaseOrder, receipt_data: dict = None) -> dict:
        """
        Record a partial or full delivery against a Purchase Order.

        Args:
            order:        PurchaseOrder instance.
            receipt_data: Dict with the shape:
                {
                    "receipts": {              # Required — maps item UUID → qty string
                        "<item-id>": "10",
                        "<item-id>": "5",
                        ...
                    },
                    "vehicle_number": "BA 1 CHA 1234",   # Optional
                    "delivered_by":   "Ram Bahadur",     # Optional
                    "document_ref":   "DN-1001",         # Optional
                    "notes":          "First shipment",  # Optional
                }

        Returns:
            dict with keys: received_items (int), skipped_items (int)

        Raises:
            ValueError if no items are provided or all quantities are zero.
        """
        if receipt_data is None:
            receipt_data = {}

        # ── Extract & validate the receipts dict ──────────────────────────────
        raw_qtys: dict = receipt_data.get("receipts")
        if not isinstance(raw_qtys, dict):
            raw_qtys = {}

        # Shipment-level metadata
        vehicle_number = str(receipt_data.get("vehicle_number") or "").strip()
        delivered_by   = str(receipt_data.get("delivered_by")   or "").strip()
        document_ref   = str(receipt_data.get("document_ref")   or "").strip()
        notes          = str(receipt_data.get("notes")          or "").strip()

        ref      = str(order.order_number or order.id)
        supplier = order.supplier
        items    = order.items.select_related("material").all()

        received_count = 0
        skipped_count  = 0

        for item in items:
            item_id_str = str(item.id)
            remaining   = item.quantity - item.received_qty

            # Determine quantity to receive in this batch
            if raw_qtys:
                raw_val = raw_qtys.get(item_id_str, "0")
                try:
                    qty_to_receive = Decimal(str(raw_val)).quantize(Decimal("0.001"))
                except (InvalidOperation, TypeError):
                    qty_to_receive = Decimal("0")
            else:
                # No explicit dict — receive ALL remaining (legacy/fallback)
                qty_to_receive = remaining if remaining > 0 else Decimal("0")

            # Validate: skip if zero or already fully received
            if qty_to_receive <= 0:
                skipped_count += 1
                continue

            if remaining <= 0:
                # Already fully received — skip silently
                skipped_count += 1
                continue

            # Clamp to remaining so we never over-receive
            qty_to_receive = min(qty_to_receive, remaining)

            # ── Auto-create material record if missing ─────────────────────────
            if item.material is None:
                name = (item.description or f"PO Item ({order.order_number or order.id})").strip()
                item.material = StockService._get_or_create_material(
                    name=name,
                    unit_price=item.unit_price,
                    project=order.project,
                )
                item.save(update_fields=["material"])

            if item.material is None:
                skipped_count += 1
                continue

            # ── Record stock-in movement ──────────────────────────────────────
            default_note = f"PO receipt — {ref}"
            StockService.add_stock(
                material=item.material,
                quantity=qty_to_receive,
                unit_price=item.unit_price,
                reference=ref,
                project=order.project,
                notes=notes or default_note,
                supplier=supplier,
                purchase_order=order,
                vehicle_number=vehicle_number,
                delivered_by=delivered_by,
                document_ref=document_ref,
            )

            # ── Update item received quantity ─────────────────────────────────
            item.received_qty += qty_to_receive
            item.save(update_fields=["received_qty"])
            received_count += 1

        if received_count == 0:
            raise ValueError(
                "No items were received. "
                "Please enter a quantity greater than zero for at least one item."
            )

        # ── Update PO status based on actual coverage ─────────────────────────
        order.refresh_from_db()
        if order.is_fully_received:
            order.status = PurchaseOrder.Status.RECEIVED
        elif order.is_partially_received:
            order.status = PurchaseOrder.Status.PARTIAL
        # (If somehow nothing was received, leave status unchanged)
        order.save(update_fields=["status"])

        return {"received_items": received_count, "skipped_items": skipped_count}

    @staticmethod
    def _get_or_create_material(name: str, unit_price: Decimal,
                                project) -> "Material":
        """
        Find an existing active material with this name in the project,
        or create a new one.
        """
        mat = Material.objects.filter(
            project=project,
            name__iexact=name,
            is_active=True,
        ).first()
        if mat:
            return mat
        return Material.objects.create(
            project=project,
            name=name,
            category=Material.Category.OTHER,
            unit=Material.Unit.PIECE,
            unit_price=unit_price or Decimal("0"),
            stock_qty=Decimal("0"),
        )
