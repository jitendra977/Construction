from django.db import transaction
from django.core.exceptions import ValidationError
from django.apps import apps
from decimal import Decimal
from .models import MaterialTransaction, Material

class ResourceService:
    @staticmethod
    @transaction.atomic
    def process_material_transaction(material, transaction_type, quantity, date, 
                                   status='RECEIVED', unit_price=None, supplier=None, 
                                   funding_source=None, phase=None, purpose="", 
                                   notes="", create_expense=True):
        """
        Processes a material movement, updates stock, and handles expense generation.
        """
        if quantity <= 0:
            raise ValidationError("Quantity must be positive.")

        # 1. Create Transaction record
        txn = MaterialTransaction.objects.create(
            material=material,
            transaction_type=transaction_type,
            status=status,
            quantity=quantity,
            unit_price=unit_price,
            date=date,
            supplier=supplier,
            funding_source=funding_source,
            phase=phase,
            purpose=purpose,
            notes=notes,
            create_expense=create_expense
        )

        if status == 'RECEIVED':
            ResourceService._apply_stock_impact(txn)
            if create_expense:
                ResourceService._handle_linked_expense(txn)

        return txn

    @staticmethod
    def _apply_stock_impact(txn):
        mat = txn.material
        if txn.transaction_type == 'IN':
            # Update Average Cost on Purchase
            if txn.unit_price:
                total_purchased = mat.quantity_purchased + txn.quantity
                if total_purchased > 0:
                    current_avg = mat.avg_cost_per_unit or Decimal('0')
                    new_avg = ((mat.quantity_purchased * current_avg) + (txn.quantity * txn.unit_price)) / total_purchased
                    mat.avg_cost_per_unit = new_avg
            
            mat.quantity_purchased += txn.quantity
            
        elif txn.transaction_type in ['OUT', 'WASTAGE']:
            current_available = mat.quantity_purchased - mat.quantity_used
            if txn.quantity > current_available:
                raise ValidationError(f"Insufficient stock! Available: {current_available}, Requested: {txn.quantity}")
            mat.quantity_used += txn.quantity
            
        elif txn.transaction_type == 'RETURN':
            mat.quantity_purchased -= txn.quantity

        mat.save(update_fields=['quantity_purchased', 'quantity_used', 'current_stock', 'avg_cost_per_unit'])

    @staticmethod
    def _handle_linked_expense(txn):
        Expense = apps.get_model('finance', 'Expense')
        BudgetCategory = apps.get_model('finance', 'BudgetCategory')
        
        category = txn.material.budget_category
        if not category:
            category, _ = BudgetCategory.objects.get_or_create(
                name="Miscellaneous Materials", 
                defaults={'allocation': 0}
            )

        if txn.transaction_type == 'IN':
            expense_title = f"Purchase: {txn.quantity} {txn.material.get_unit_display()} {txn.material.name}"
            amount = txn.quantity * (txn.unit_price or 0)
            is_usage = False
            paid_to = txn.supplier.name if txn.supplier else "Cash Purchase"
        elif txn.transaction_type == 'OUT':
            expense_title = f"Usage: {txn.quantity} {txn.material.get_unit_display()} {txn.material.name} for {txn.phase.name if txn.phase else txn.purpose or 'Site'}"
            amount = txn.quantity * (txn.material.avg_cost_per_unit or 0)
            is_usage = True
            paid_to = "Inventory Allocation"
        else:
            return # No expense for wastage/return handled here currently

        new_expense = Expense.objects.create(
            title=expense_title,
            amount=amount,
            expense_type='MATERIAL',
            category=category,
            phase=txn.phase,
            material=txn.material,
            quantity=txn.quantity,
            unit_price=txn.unit_price if not is_usage else txn.material.avg_cost_per_unit,
            supplier=txn.supplier,
            funding_source=txn.funding_source,
            date=txn.date,
            paid_to=paid_to,
            is_paid=False,  # Initially unpaid, will be updated by process_payment if funded
            is_inventory_usage=is_usage,
            notes=f"Auto-generated from Material {txn.get_transaction_type_display()}"
        )
        
        # 1. NEW: Process actual payment if funding_source is provided for a purchase
        if txn.transaction_type == 'IN' and txn.funding_source:
            from apps.finance.services import FinanceService
            # We assume it's fully paid since it was selected at time of stock registration
            FinanceService.process_payment(
                expense=new_expense,
                amount=amount,
                date=txn.date,
                method='CASH', # Defaulting to CASH for stock entries
                funding_source=txn.funding_source,
                notes=f"Automatic payment for stock purchase: {txn.material.name}"
            )
        elif is_usage:
            # Usage is a virtual expense (inventory allocation), so mark it paid without account movement
            new_expense.is_paid = True
            new_expense.save(update_fields=['is_paid'])

        txn.expense = new_expense
        txn.save(update_fields=['expense'])

    @staticmethod
    @transaction.atomic
    def delete_material_transaction(txn):
        """
        Deletes a transaction and reverses stock/expense impacts.
        """
        mat = txn.material
        if txn.status == 'RECEIVED':
            if txn.transaction_type == 'IN':
                mat.quantity_purchased -= txn.quantity
            elif txn.transaction_type in ['OUT', 'WASTAGE']:
                mat.quantity_used -= txn.quantity
            elif txn.transaction_type == 'RETURN':
                mat.quantity_purchased += txn.quantity
            mat.save()
            
            if txn.expense:
                # 2. NEW: Explicitly delete payments via FinanceService 
                # to ensure FundingSource balances are accurately refunded
                from apps.finance.services import FinanceService
                for payment in txn.expense.payments.all():
                    FinanceService.delete_payment(payment)
                txn.expense.delete()
        
        txn.delete()

    @staticmethod
    @transaction.atomic
    def receive_pending_transaction(txn, new_quantity=None, new_unit_price=None):
        """
        Finalizes a pending order, applying stock impact and creating expenses.
        """
        from django.utils import timezone
        if txn.status != 'PENDING':
            raise ValidationError("Only PENDING transactions can be received.")

        if new_quantity:
            txn.quantity = new_quantity
        if new_unit_price:
            txn.unit_price = new_unit_price
        
        txn.status = 'RECEIVED'
        txn.date = timezone.now().date()
        txn.save()

        ResourceService._apply_stock_impact(txn)
        if txn.create_expense:
            ResourceService._handle_linked_expense(txn)
        
        return txn
