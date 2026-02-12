from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.dispatch import receiver
from decimal import Decimal
from .models import Payment, FundingTransaction, FundingSource, Expense

@receiver(pre_save, sender=Payment)
def payment_pre_save(sender, instance, **kwargs):
    """
    Store the old amount to handle balance updates correctly in post_save.
    """
    if instance.id:
        try:
            instance._old_amount = Payment.objects.get(id=instance.id).amount
        except Payment.DoesNotExist:
            instance._old_amount = 0
    else:
        instance._old_amount = 0

@receiver(post_save, sender=Payment)
def payment_post_save(sender, instance, created, **kwargs):
    """
    When a payment is recorded or updated, if the expense has a funding source,
    debit that funding source and record/update a transaction.
    """
    if kwargs.get('raw'):
        return
    expense = instance.expense
    # Use payment-level override if set, otherwise fallback to expense default
    funding_source = instance.funding_source or expense.funding_source

    if funding_source:
        if created:
            # Create a debit transaction
            FundingTransaction.objects.create(
                funding_source=funding_source,
                amount=instance.amount,
                transaction_type='DEBIT',
                date=instance.date,
                description=f"Payment for: {expense.title}",
                payment=instance
            )
            
            # Update current balance
            funding_source.current_balance = Decimal(str(funding_source.current_balance)) - instance.amount
            funding_source.save()
        else:
            # Handle updates
            old_amount = getattr(instance, '_old_amount', 0)
            diff = instance.amount - old_amount
            
            if diff != 0:
                # Update current balance
                funding_source.current_balance = Decimal(str(funding_source.current_balance)) - diff
                funding_source.save()
                
                # Update or create the transaction
                trans, trans_created = FundingTransaction.objects.update_or_create(
                    payment=instance,
                    defaults={
                        'amount': instance.amount,
                        'date': instance.date,
                        'description': f"Payment for: {expense.title} (Updated)",
                    }
                )

    # Update expense is_paid status
    # Recalculate based on current state to be safe
    total_paid = sum(p.amount for p in expense.payments.all())
    if total_paid >= expense.amount:
        if not expense.is_paid:
            expense.is_paid = True
            expense.save()
    else:
        if expense.is_paid:
            expense.is_paid = False
            expense.save()

@receiver(pre_delete, sender=Payment)
def payment_pre_delete(sender, instance, **kwargs):
    """
    When a payment is deleted, refund the amount to the funding source
    and delete the related funding transaction.
    We use pre_delete to ensure we can find the transactions before 
    the foreign key is nullified by on_delete=SET_NULL.
    """
    expense = instance.expense
    # Prioritize payment-level funding source override
    funding_source = instance.funding_source or expense.funding_source

    if funding_source:
        # Find the related transaction(s)
        transactions = FundingTransaction.objects.filter(payment=instance)
        
        refund_amount = 0
        for trans in transactions:
            refund_amount += trans.amount
            trans.delete()
        
        if refund_amount > 0:
            funding_source.current_balance = Decimal(str(funding_source.current_balance)) + refund_amount
            funding_source.save()

    # Note: expense is_paid status will be handled in a separate signal or post_delete
    # but for simplicity we can't easily recalculate total_paid here because 
    # the current instance is still in the queryset.
    # We will use post_delete for the is_paid status update.

@receiver(post_delete, sender=Payment)
def payment_post_delete(sender, instance, **kwargs):
    """
    Update expense is_paid status after a payment is deleted.
    """
    expense = instance.expense
    total_paid = sum(p.amount for p in expense.payments.all())
    if total_paid >= expense.amount:
        if not expense.is_paid:
            expense.is_paid = True
            expense.save()
    else:
        if expense.is_paid:
            expense.is_paid = False
            expense.save()

@receiver(post_save, sender=FundingTransaction)
def funding_transaction_post_save(sender, instance, created, **kwargs):
    """
    Handle balance updates for manual funding transactions (not linked to a payment).
    """
    if kwargs.get('raw'):
        return
    if created and not instance.payment:
        # Avoid double-processing the initial allocation
        if "Initial" in instance.description:
            return

        fs = instance.funding_source
        if instance.transaction_type == 'CREDIT':
            fs.current_balance = Decimal(str(fs.current_balance)) + instance.amount
            fs.amount = Decimal(str(fs.amount)) + instance.amount  # Increase total capital too
        else:
            fs.current_balance = Decimal(str(fs.current_balance)) - instance.amount
        
        fs.save()

@receiver(post_delete, sender=FundingTransaction)
def funding_transaction_post_delete(sender, instance, **kwargs):
    """
    Revert balance updates when a manual funding transaction is deleted.
    """
    if not instance.payment:
        fs = instance.funding_source
        if instance.transaction_type == 'CREDIT':
            fs.current_balance = Decimal(str(fs.current_balance)) - instance.amount
            if "Initial" not in instance.description:
                fs.amount = Decimal(str(fs.amount)) - instance.amount
        else:
            fs.current_balance = Decimal(str(fs.current_balance)) + instance.amount
        
        fs.save()
@receiver(post_save, sender=Expense)
def expense_post_save(sender, instance, created, **kwargs):
    """
    Sync Expense with MaterialTransaction for Stock In.
    """
    if kwargs.get('raw'):
        return
    # Guard against recursion if triggered by MaterialTransaction.save()
    if getattr(instance, '_from_transaction', False):
        return

    if instance.expense_type == 'MATERIAL' and instance.material and instance.quantity:
        from apps.resources.models import MaterialTransaction
        
        # Determine if we should update or create
        # We look for a transaction already linked to this expense
        transaction = MaterialTransaction.objects.filter(expense=instance, transaction_type='IN').first()
        
        if transaction:
            # Update existing transaction
            transaction.material = instance.material
            transaction.quantity = instance.quantity
            transaction.unit_price = instance.unit_price
            transaction.date = instance.date
            transaction.supplier = instance.supplier
            transaction.funding_source = instance.funding_source
            transaction.notes = f"Updated from Expense: {instance.title}"
            # Signal guard for transaction side if needed, but currently resources/models.py handles it
            transaction.save()
        else:
            # Create new transaction
            MaterialTransaction.objects.create(
                material=instance.material,
                transaction_type='IN',
                quantity=instance.quantity,
                unit_price=instance.unit_price,
                date=instance.date,
                supplier=instance.supplier,
                expense=instance,
                funding_source=instance.funding_source,
                notes=f"Auto-generated from Expense: {instance.title}",
                create_expense=True 
            )

@receiver(post_delete, sender=Expense)
def expense_post_delete(sender, instance, **kwargs):
    """
    Delete linked MaterialTransaction when Expense is deleted.
    """
    if instance.expense_type == 'MATERIAL':
        from apps.resources.models import MaterialTransaction
        MaterialTransaction.objects.filter(expense=instance, transaction_type='IN').delete()
