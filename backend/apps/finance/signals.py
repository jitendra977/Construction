"""
Finance signals.

Thin layer: (1) route model-level save/delete to the FinanceService so the
ledger stays consistent, (2) emit audit logs, (3) emit a `budget_exceeded`
signal that other apps can react to.

Heavy lifting lives in services.py.
"""

import logging
from decimal import Decimal

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver, Signal

from utils.audit_log import log_activity_automated
from apps.core.signals import get_current_user, get_current_request

from .models import (
    ZERO,
    Expense,
    Payment,
    FundingSource,
    FundingTransaction,
    Bill,
    BillPayment,
    BankTransfer,
)
from .services import BillService, TransferService, FundingService

logger = logging.getLogger(__name__)

budget_exceeded = Signal()


# -----------------------------------------------------------------------------
# Bills — auto-post to GL on first save
# -----------------------------------------------------------------------------

@receiver(post_save, sender=Bill)
def bill_post_save(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    if created and not instance.journal_entry_id:
        # Posting requires items; if there are no items yet, we post a generic
        # debit to the default expense account — the service handles that.
        try:
            BillService.post_bill_ledger(instance)
        except Exception as e:
            logger.exception(f"Failed to post bill {instance.id} to GL: {e}")


@receiver(post_delete, sender=Bill)
def bill_post_delete(sender, instance, **kwargs):
    if instance.journal_entry_id:
        from .services import LedgerService
        try:
            LedgerService.reverse(instance.journal_entry)
        except Exception as e:
            logger.exception(f"Failed to reverse JE for deleted bill {instance.id}: {e}")


# -----------------------------------------------------------------------------
# Bank transfers — auto-execute on first save
# -----------------------------------------------------------------------------

@receiver(post_save, sender=BankTransfer)
def bank_transfer_post_save(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    if created and not instance.journal_entry_id:
        try:
            TransferService.execute(instance)
        except Exception as e:
            logger.exception(f"Bank transfer {instance.id} failed: {e}")


@receiver(post_delete, sender=BankTransfer)
def bank_transfer_post_delete(sender, instance, **kwargs):
    if instance.journal_entry_id:
        from .services import LedgerService
        LedgerService.reverse(instance.journal_entry)


# -----------------------------------------------------------------------------
# Funding
# -----------------------------------------------------------------------------

@receiver(post_save, sender=FundingSource)
def funding_source_post_save(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    if created:
        FundingService.bootstrap(instance)
    else:
        FundingService.sync_initial_transaction(instance)


@receiver(post_save, sender=FundingTransaction)
def funding_transaction_post_save(sender, instance, created, **kwargs):
    if kwargs.get("raw"):
        return
    # Initial allocation is already reflected via bootstrap.
    if created and instance.description != "Initial Funding Allocation":
        # Manual adjustments (top-up/withdraw) + payment-linked txs are applied
        # here; payment-driven txs are applied inside FinanceService.process_payment
        # but applying again is safe only if we skip those. The service sets
        # `payment` FK, so detect that and skip.
        if instance.payment_id is None:
            FundingService.apply_transaction(instance)


@receiver(post_delete, sender=FundingTransaction)
def funding_transaction_post_delete(sender, instance, **kwargs):
    # Only manual transactions (no payment FK) need reversing here —
    # payment-linked ones are already reversed by FinanceService.delete_payment.
    if instance.payment_id is None and instance.description != "Initial Funding Allocation":
        FundingService.reverse_transaction(instance)


# -----------------------------------------------------------------------------
# Budget alerts — fires when an expense crosses its category's allocation
# -----------------------------------------------------------------------------

@receiver(post_save, sender=Expense)
def expense_budget_guard(sender, instance, created, **kwargs):
    if kwargs.get("raw") or not instance.category:
        return
    spent = instance.category.total_spent or ZERO
    allocation = instance.category.allocation or ZERO
    if allocation and spent > allocation:
        over = spent - allocation
        budget_exceeded.send(
            sender=Expense,
            category=instance.category,
            expense=instance,
            amount_exceeded=Decimal(over),
        )
        logger.warning(
            f"BUDGET ALERT: Category '{instance.category.name}' is over allocation by Rs.{over}"
        )


# -----------------------------------------------------------------------------
# Audit logging — every finance mutation
# -----------------------------------------------------------------------------

_AUDITED = (Expense, Payment, FundingSource, FundingTransaction, Bill, BillPayment, BankTransfer)

for model in _AUDITED:
    @receiver(post_save, sender=model, weak=False)
    def _audit_save(sender, instance, created, **kwargs):
        if kwargs.get("raw"):
            return
        action = "CREATE" if created else "UPDATE"
        try:
            log_activity_automated(
                get_current_request(),
                get_current_user(),
                action,
                instance,
                description=f"{action} {sender.__name__}: {instance}",
            )
        except Exception as e:
            logger.debug(f"Audit log failed for {sender.__name__}: {e}")

    @receiver(post_delete, sender=model, weak=False)
    def _audit_delete(sender, instance, **kwargs):
        try:
            log_activity_automated(
                get_current_request(),
                get_current_user(),
                "DELETE",
                instance,
                description=f"DELETED {sender.__name__}: {instance}",
            )
        except Exception as e:
            logger.debug(f"Audit log delete failed for {sender.__name__}: {e}")
