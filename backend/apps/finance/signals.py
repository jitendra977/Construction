from django.db.models.signals import post_save, post_delete, pre_save, pre_delete
from django.dispatch import receiver, Signal
from decimal import Decimal
import logging
from .models import Payment, FundingTransaction, FundingSource, Expense
from utils.audit_log import log_activity_automated, get_model_diff
from apps.core.signals import get_current_user, get_current_request

logger = logging.getLogger(__name__)

# Custom Signals
budget_exceeded = Signal()

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

@receiver(budget_exceeded)
def handle_budget_exceeded(sender, category, expense, amount_exceeded, **kwargs):
    """
    Log or trigger an alert when a category's budget is exceeded by a new expense.
    """
    logger.warning(
        f"BUDGET ALERT: Expense '{expense.title}' on category '{category.name}' "
        f"exceeds allocation by Rs. {amount_exceeded}!"
    )
    # Future enhancement: Create persistent Alert model instance here for dashboard notifications.


# --- AUTOMATED AUDIT LOG SIGNALS ---

@receiver(post_save, sender=FundingTransaction)
@receiver(post_save, sender=Payment)
@receiver(post_save, sender=Expense)
@receiver(post_save, sender=FundingSource)
def finance_audit_log_save(sender, instance, created, **kwargs):
    if kwargs.get('raw'): return
    action = 'CREATE' if created else 'UPDATE'
    user = get_current_user()
    request = get_current_request()
    
    log_activity_automated(
        request, user, action, instance, 
        description=f"{action} {sender.__name__}: {str(instance)}"
    )

@receiver(post_delete, sender=FundingTransaction)
@receiver(post_delete, sender=Payment)
@receiver(post_delete, sender=Expense)
@receiver(post_delete, sender=FundingSource)
def finance_audit_log_delete(sender, instance, **kwargs):
    user = get_current_user()
    request = get_current_request()
    
    log_activity_automated(
        request, user, 'DELETE', instance,
        description=f"DELETED {sender.__name__}: {str(instance)}"
    )

