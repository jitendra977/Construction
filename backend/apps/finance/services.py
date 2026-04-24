"""
Finance business logic.

All flows that cross model boundaries (create a Bill => also post to ledger,
record a payment => update bill + update funding source) live here, so save()
methods stay side-effect free and code paths are testable in isolation.
"""

from __future__ import annotations

from decimal import Decimal
from datetime import date as date_cls

from django.db import transaction
from django.core.exceptions import ValidationError

from .models import (
    ZERO,
    Account,
    JournalEntry,
    JournalLine,
    Bill,
    BillItem,
    BillPayment,
    BankTransfer,
    Expense,
    Payment,
    FundingSource,
    FundingTransaction,
)


def _post(je, account, amount, entry_type, description=""):
    return JournalLine.objects.create(
        journal_entry=je,
        account=account,
        amount=amount,
        entry_type=entry_type,
        description=description,
    )


class LedgerService:
    """Low-level helpers on top of JournalEntry/JournalLine."""

    @staticmethod
    @transaction.atomic
    def post(
        *,
        date,
        description,
        source="MANUAL",
        reference_id="",
        lines,
    ):
        """Post a balanced journal entry. `lines` is a list of dicts:
        [{"account": acc, "amount": Decimal, "entry_type": "DEBIT"|"CREDIT", "description": str}]
        """
        if not lines:
            raise ValidationError("A journal entry needs at least one line.")
        debit = sum((l["amount"] for l in lines if l["entry_type"] == "DEBIT"), ZERO)
        credit = sum((l["amount"] for l in lines if l["entry_type"] == "CREDIT"), ZERO)
        if debit != credit:
            raise ValidationError(f"Journal entry out of balance: Dr {debit} vs Cr {credit}.")

        je = JournalEntry.objects.create(
            date=date,
            description=description,
            source=source,
            reference_id=reference_id,
        )
        for line in lines:
            _post(
                je,
                account=line["account"],
                amount=line["amount"],
                entry_type=line["entry_type"],
                description=line.get("description", ""),
            )
        return je

    @staticmethod
    @transaction.atomic
    def reverse(je):
        """Delete a journal entry and all its lines. Used when the source doc is deleted."""
        if not je:
            return
        je.lines.all().delete()
        je.delete()


class BillService:
    """Accounts-payable flows."""

    @staticmethod
    @transaction.atomic
    def post_bill_ledger(bill: Bill):
        """Create the journal entry for a newly-created bill.
        Dr Expense (for each item, or generic), Cr Accounts Payable.
        Idempotent — skips if bill already has a linked JE.
        """
        if bill.journal_entry_id:
            return bill.journal_entry

        ap = Account.default_ap()
        items = list(bill.items.all())

        lines = [{
            "account": ap,
            "amount": bill.total_amount,
            "entry_type": "CREDIT",
            "description": f"Liability to {bill.supplier or bill.contractor or 'vendor'}",
        }]

        if items:
            for it in items:
                acc = (
                    it.account
                    or (it.category.associated_account if it.category else None)
                    or Account.default_expense()
                )
                lines.append({
                    "account": acc,
                    "amount": it.amount,
                    "entry_type": "DEBIT",
                    "description": it.description,
                })
        else:
            lines.append({
                "account": Account.default_expense(),
                "amount": bill.total_amount,
                "entry_type": "DEBIT",
                "description": f"Bill {bill.bill_number or bill.id}",
            })

        je = LedgerService.post(
            date=bill.date_issued,
            description=f"Bill from {bill.supplier or bill.contractor or 'vendor'} ({bill.bill_number or bill.id})",
            source="BILL",
            reference_id=bill.bill_number or str(bill.id),
            lines=lines,
        )
        bill.journal_entry = je
        bill.save(update_fields=["journal_entry"])
        return je

    @staticmethod
    @transaction.atomic
    def sync_bill_ledger(bill: Bill):
        """Update the ledger entry for an existing bill.
        Reverse the old one (if any) and post a new one.
        """
        if bill.journal_entry:
            old_je = bill.journal_entry
            bill.journal_entry = None
            bill.save(update_fields=["journal_entry"])
            LedgerService.reverse(old_je)
        
        return BillService.post_bill_ledger(bill)

    @staticmethod
    @transaction.atomic
    def pay_bill(
        bill: Bill,
        *,
        account: Account,
        amount: Decimal,
        date,
        method: str,
        reference_id: str = "",
    ) -> BillPayment:
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError("Payment amount must be positive.")
        if amount > bill.balance_due:
            raise ValidationError(
                f"Payment ({amount}) exceeds outstanding balance ({bill.balance_due})."
            )

        payment = BillPayment.objects.create(
            bill=bill,
            account=account,
            amount=amount,
            date=date,
            method=method,
            reference_id=reference_id,
        )

        # Post the payment to GL: Dr AP, Cr Asset
        ap = Account.default_ap()
        je = LedgerService.post(
            date=date,
            description=f"Payment for Bill {bill.bill_number or bill.id}",
            source="PAYMENT",
            reference_id=reference_id or f"PAY-{payment.id}",
            lines=[
                {"account": ap, "amount": amount, "entry_type": "DEBIT",
                 "description": f"Settling AP for Bill {bill.bill_number or bill.id}"},
                {"account": account, "amount": amount, "entry_type": "CREDIT",
                 "description": f"Cash out via {method}"},
            ],
        )
        payment.journal_entry = je
        payment.save(update_fields=["journal_entry"])

        # Update the bill in one DB round-trip.
        bill.amount_paid = (bill.amount_paid or ZERO) + amount
        bill.recompute_status()
        bill.save(update_fields=["amount_paid", "status"])

        return payment

    @staticmethod
    @transaction.atomic
    def delete_bill_payment(payment: BillPayment):
        bill = payment.bill
        amount = payment.amount

        LedgerService.reverse(payment.journal_entry)

        payment.delete()
        bill.amount_paid = max(ZERO, (bill.amount_paid or ZERO) - amount)
        bill.recompute_status()
        bill.save(update_fields=["amount_paid", "status"])

    @staticmethod
    @transaction.atomic
    def delete_bill(bill: Bill):
        """Fully unwind a bill: payments + journal entries + the bill itself."""
        for p in list(bill.payments.all()):
            BillService.delete_bill_payment(p)
        LedgerService.reverse(bill.journal_entry)
        bill.delete()


class TransferService:
    @staticmethod
    @transaction.atomic
    def execute(transfer: BankTransfer):
        if transfer.journal_entry_id:
            return transfer.journal_entry
        if transfer.from_account_id == transfer.to_account_id:
            raise ValidationError("From and To accounts must differ.")
        if transfer.amount <= 0:
            raise ValidationError("Transfer amount must be positive.")

        je = LedgerService.post(
            date=transfer.date,
            description=f"Transfer {transfer.from_account.name} -> {transfer.to_account.name}",
            source="TRANSFER",
            reference_id=transfer.reference_id or f"TRX-{transfer.id}",
            lines=[
                {"account": transfer.from_account, "amount": transfer.amount, "entry_type": "CREDIT",
                 "description": "Transfer out"},
                {"account": transfer.to_account, "amount": transfer.amount, "entry_type": "DEBIT",
                 "description": "Transfer in"},
            ],
        )
        transfer.journal_entry = je
        transfer.save(update_fields=["journal_entry"])
        return je

    @staticmethod
    @transaction.atomic
    def sync(transfer: BankTransfer):
        """Update the ledger entry for an existing transfer."""
        if transfer.journal_entry:
            old_je = transfer.journal_entry
            transfer.journal_entry = None
            transfer.save(update_fields=["journal_entry"])
            LedgerService.reverse(old_je)
        
        return TransferService.execute(transfer)

    @staticmethod
    @transaction.atomic
    def delete(transfer: BankTransfer):
        LedgerService.reverse(transfer.journal_entry)
        transfer.delete()


class FundingService:
    """Keep FundingSource.current_balance in sync with transactions."""


    @staticmethod
    @transaction.atomic
    def recalculate(source: FundingSource):
        source.current_balance = source.true_balance
        source.save(update_fields=["current_balance"])
        return source.current_balance

    @staticmethod
    @transaction.atomic
    def sync_initial_transaction(source: FundingSource):
        """Ensure the 'Initial Funding Allocation' transaction matches source.amount.
        Called on update.
        """
        init_tx = source.transactions.filter(description="Initial Funding Allocation").first()
        if not init_tx:
            # If somehow missing, bootstrap it
            return FundingService.bootstrap(source)
            
        if init_tx.amount != source.amount:
            init_tx.amount = source.amount
            init_tx.save(update_fields=["amount"])
            FundingService.recalculate(source)
            
        # Always sync GL post (it handles link/unlink correctly)
        FundingService.update_gl_post(init_tx)

    @staticmethod
    @transaction.atomic
    def bootstrap(source: FundingSource):
        """Called right after a FundingSource is created: record the initial inflow."""
        if source.transactions.filter(description="Initial Funding Allocation").exists():
            return
            
        tx = FundingTransaction.objects.create(
            funding_source=source,
            amount=source.amount,
            transaction_type="CREDIT",
            date=source.received_date,
            description="Initial Funding Allocation",
        )
        FundingService.update_gl_post(tx)
        FundingService.recalculate(source)

    @staticmethod
    @transaction.atomic
    def update_gl_post(tx: FundingTransaction):
        """Post or update the GL entry for a funding transaction if linked to an account."""
        fs = tx.funding_source
        if not fs.associated_account:
            # If it had a JE but is now unlinked, reverse it
            if tx.journal_entry:
                LedgerService.reverse(tx.journal_entry)
            return

        # We only post manual credits (deposits) or bootstrap.
        # Payment-linked debits are already posted by BillService/FinanceService.
        if tx.payment_id:
            return

        is_credit = tx.transaction_type == "CREDIT"
        # Natural side for Asset (Bank/Cash) is DEBIT on increase.
        own_side = "DEBIT" if is_credit else "CREDIT"
        eq_side = "CREDIT" if is_credit else "DEBIT"
        
        equity = Account.default_equity()
        
        lines = [
            {"account": fs.associated_account, "amount": tx.amount, "entry_type": own_side,
             "description": tx.description},
            {"account": equity, "amount": tx.amount, "entry_type": eq_side,
             "description": f"Funding offset: {fs.name}"},
        ]

        if tx.journal_entry:
            # Update existing JE
            tx.journal_entry.date = tx.date
            tx.journal_entry.description = tx.description
            tx.journal_entry.save()
            tx.journal_entry.lines.all().delete()
            for line in lines:
                _post(tx.journal_entry, **line)
        else:
            # Create new JE
            je = LedgerService.post(
                date=tx.date,
                description=tx.description,
                source="FUNDING",
                reference_id=f"FT-{tx.id}",
                lines=lines
            )
            tx.journal_entry = je
            tx.save(update_fields=["journal_entry"])

    @staticmethod
    @transaction.atomic
    def apply_transaction(tx: FundingTransaction):
        """Update source balance and ensure GL is in sync."""
        FundingService.update_gl_post(tx)
        FundingService.recalculate(tx.funding_source)

    @staticmethod
    @transaction.atomic
    def reverse_transaction(tx: FundingTransaction):
        """Reverse GL entry and update source balance."""
        if tx.journal_entry:
            LedgerService.reverse(tx.journal_entry)
        
        fs = tx.funding_source
        # Use recalculate instead of manual math to be safer
        tx.delete() # Note: caller usually deletes, but we do it here if needed
        FundingService.recalculate(fs)


class FinanceService:
    """Expense / Payment flow — kept thin and compatible with existing callers."""

    # --- Expense / Payment ---------------------------------------------------

    @staticmethod
    @transaction.atomic
    def process_payment(
        *,
        expense: Expense,
        amount: Decimal,
        date,
        method: str,
        funding_source: FundingSource | None = None,
        reference_id: str = "",
        notes: str = "",
        proof_photo=None,
    ) -> Payment:
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError("Payment amount must be positive.")

        payment = Payment.objects.create(
            expense=expense,
            funding_source=funding_source,
            amount=amount,
            date=date,
            method=method,
            reference_id=reference_id,
            notes=notes,
            proof_photo=proof_photo,
        )

        if funding_source:
            tx = FundingTransaction.objects.create(
                funding_source=funding_source,
                amount=amount,
                transaction_type="DEBIT",
                date=date,
                description=f"Payment for: {expense.title}",
                payment=payment,
            )
            FundingService.apply_transaction(tx)

        # Mark the expense paid when applicable
        expense.is_paid = expense.total_paid >= expense.amount
        expense.save(update_fields=["is_paid"])
        return payment

    @staticmethod
    @transaction.atomic
    def update_payment(payment: Payment, **kwargs):
        # Reverse any existing funding-transaction(s), apply updates, re-post.
        # reverse_transaction already deletes the tx — iterate over a list snapshot
        # so the queryset iterator doesn't drop rows mid-delete.
        for tx in list(payment.funding_transactions.all()):
            FundingService.reverse_transaction(tx)

        for field, value in kwargs.items():
            setattr(payment, field, value)
        payment.save()

        if payment.funding_source:
            tx = FundingTransaction.objects.create(
                funding_source=payment.funding_source,
                amount=payment.amount,
                transaction_type="DEBIT",
                date=payment.date,
                description=f"Payment for: {payment.expense.title}",
                payment=payment,
            )
            FundingService.apply_transaction(tx)

        exp = payment.expense
        exp.is_paid = exp.total_paid >= exp.amount
        exp.save(update_fields=["is_paid"])
        return payment

    @staticmethod
    @transaction.atomic
    def delete_payment(payment: Payment):
        for tx in list(payment.funding_transactions.all()):
            FundingService.reverse_transaction(tx)

        expense = payment.expense
        payment.delete()

        if expense:
            expense.is_paid = expense.total_paid >= expense.amount
            expense.save(update_fields=["is_paid"])

    # --- Account opening balance --------------------------------------------

    @staticmethod
    @transaction.atomic
    def post_opening_balance(account: Account, amount: Decimal):
        """Dr/Cr the new account vs Owner Capital based on its natural side."""
        amount = Decimal(str(amount))
        if amount == 0:
            return None
        equity = Account.default_equity()
        natural_debit = account.account_type in ("ASSET", "EXPENSE")
        own_side = "DEBIT" if natural_debit else "CREDIT"
        eq_side = "CREDIT" if natural_debit else "DEBIT"
        return LedgerService.post(
            date=date_cls.today(),
            description=f"Opening balance for {account.name}",
            source="INITIAL",
            reference_id=f"INIT-{account.id}",
            lines=[
                {"account": account, "amount": amount, "entry_type": own_side,
                 "description": "Initial Balance"},
                {"account": equity, "amount": amount, "entry_type": eq_side,
                 "description": f"Opening balance offset for {account.name}"},
            ],
        )
