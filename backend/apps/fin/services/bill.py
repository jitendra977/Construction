"""
BillService — handles creating bills and recording payments.
"""
import datetime
from decimal import Decimal

from django.db import transaction

from ..models.journal import EntryType, SourceType
from ..models.bill import Bill, BillPayment
from .ledger import LedgerService


class BillService:

    @staticmethod
    @transaction.atomic
    def post_bill(bill: Bill, user=None) -> None:
        """
        Record a vendor bill in the ledger (creates the payable).

        Journal:
          Debit  Expense Account   (cost recognised)
          Credit Payable Account   (liability to vendor created)
        """
        if bill.journal_entry_id:
            return

        je = LedgerService.post_entry(
            date=bill.date,
            description=f"Bill from {bill.vendor_name}: {bill.description}",
            source_type=SourceType.BILL,
            source_ref=bill.invoice_number or str(bill.id)[:8],
            project_id=bill.project_id,
            user=user,
            lines=[
                {
                    "account_id": bill.expense_account_id,
                    "entry_type": EntryType.DEBIT,
                    "amount": bill.total_amount,
                    "note": "Expense recognised",
                },
                {
                    "account_id": bill.payable_account_id,
                    "entry_type": EntryType.CREDIT,
                    "amount": bill.total_amount,
                    "note": "Payable to vendor",
                },
            ],
        )
        bill.journal_entry = je
        bill.save(update_fields=["journal_entry"])

    @staticmethod
    @transaction.atomic
    def post_payment(payment: BillPayment, user=None) -> None:
        """
        Record a payment against a bill.

        Journal:
          Debit  Payable Account  (liability decreases — we paid)
          Credit Bank Account     (asset decreases — money out)
        """
        if payment.journal_entry_id:
            return

        je = LedgerService.post_entry(
            date=payment.date,
            description=f"Payment for Bill: {payment.bill.vendor_name}" +
                        (f" | {payment.reference}" if payment.reference else ""),
            source_type=SourceType.PAYMENT,
            source_ref=payment.reference or str(payment.id)[:8],
            project_id=payment.bill.project_id,
            user=user,
            lines=[
                {
                    "account_id": payment.bill.payable_account_id,
                    "entry_type": EntryType.DEBIT,
                    "amount": payment.amount,
                    "note": "Payable settled",
                },
                {
                    "account_id": payment.bank_account_id,
                    "entry_type": EntryType.CREDIT,
                    "amount": payment.amount,
                    "note": "Cash paid out",
                },
            ],
        )
        payment.journal_entry = je
        payment.save(update_fields=["journal_entry"])
