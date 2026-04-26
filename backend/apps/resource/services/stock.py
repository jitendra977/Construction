"""
StockService — manage material stock levels and purchase order receipt.
"""
from decimal import Decimal
from django.db import transaction

from ..models.material import Material
from ..models.purchase import StockMovement, PurchaseOrder


class StockService:

    @staticmethod
    @transaction.atomic
    def add_stock(material: Material, quantity: Decimal, unit_price: Decimal,
                  reference: str, project) -> StockMovement:
        """Create a StockMovement(IN) and increase material.stock_qty."""
        movement = StockMovement.objects.create(
            project=project,
            material=material,
            movement_type=StockMovement.MovementType.IN,
            quantity=quantity,
            unit_price=unit_price,
            reference=reference,
        )
        material.stock_qty += quantity
        material.save(update_fields=["stock_qty"])
        return movement

    @staticmethod
    @transaction.atomic
    def remove_stock(material: Material, quantity: Decimal, reference: str,
                     project) -> StockMovement:
        """Create a StockMovement(OUT) and decrease material.stock_qty."""
        if material.stock_qty < quantity:
            raise ValueError(
                f"Insufficient stock for '{material.name}'. "
                f"Available: {material.stock_qty}, Requested: {quantity}"
            )
        movement = StockMovement.objects.create(
            project=project,
            material=material,
            movement_type=StockMovement.MovementType.OUT,
            quantity=quantity,
            unit_price=None,
            reference=reference,
        )
        material.stock_qty -= quantity
        material.save(update_fields=["stock_qty"])
        return movement

    @staticmethod
    @transaction.atomic
    def receive_purchase_order(order: PurchaseOrder) -> None:
        """
        Receive all items in a purchase order:
        - For each item, call add_stock
        - Set item.received_qty = item.quantity
        - If all items received, mark order as RECEIVED
        """
        for item in order.items.select_related("material").all():
            if item.material and item.received_qty < item.quantity:
                qty_to_receive = item.quantity - item.received_qty
                StockService.add_stock(
                    material=item.material,
                    quantity=qty_to_receive,
                    unit_price=item.unit_price,
                    reference=str(order.order_number or order.id),
                    project=order.project,
                )
                item.received_qty = item.quantity
                item.save(update_fields=["received_qty"])

        # Reload items to check if fully received
        order.refresh_from_db()
        if order.is_fully_received:
            order.status = PurchaseOrder.Status.RECEIVED
            order.save(update_fields=["status"])
