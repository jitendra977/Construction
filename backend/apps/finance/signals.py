from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.dispatch import receiver
from decimal import Decimal
from .models import Payment, FundingTransaction, FundingSource, Expense

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
