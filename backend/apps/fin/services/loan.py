"""
LoanService — handles loan disbursements and EMI payments.
"""
import datetime
from decimal import Decimal

from django.db import transaction

from ..models.journal import EntryType, SourceType
from ..models.loan import LoanDisbursement, LoanEMIPayment
from .ledger import LedgerService


class LoanService:

    @staticmethod
    @transaction.atomic
    def disburse(disbursement: LoanDisbursement, user=None) -> None:
        """
        Bank sends you loan money into your bank account.

        Journal:
          Debit  Bank Account  (asset increases — money received)
          Credit Loan Account  (liability increases — you now owe more)
        """
        if disbursement.journal_entry_id:
            return

        je = LedgerService.post_entry(
            date=disbursement.date,
            description=f"Loan Disbursement: {disbursement.loan_account.name}" +
                        (f" | {disbursement.reference}" if disbursement.reference else ""),
            source_type=SourceType.LOAN_IN,
            source_ref=disbursement.reference,
            user=user,
            lines=[
                {
                    "account_id": disbursement.bank_account_id,
                    "entry_type": EntryType.DEBIT,
                    "amount": disbursement.amount,
                    "note": "Loan proceeds received",
                },
                {
                    "account_id": disbursement.loan_account_id,
                    "entry_type": EntryType.CREDIT,
                    "amount": disbursement.amount,
                    "note": "Loan liability created",
                },
            ],
        )
        disbursement.journal_entry = je
        disbursement.save(update_fields=["journal_entry"])

    @staticmethod
    @transaction.atomic
    def pay_emi(emi: LoanEMIPayment, user=None) -> None:
        """
        Pay one month's EMI (principal + interest).

        Journal:
          Debit  Loan Account      (liability decreases — principal paid)
          Debit  Interest Expense  (expense recognised)
          Credit Bank Account      (asset decreases — money paid out)
        """
        if emi.journal_entry_id:
            return

        interest_acc = LedgerService.get_or_create_system_account(
            name="Interest Expense",
            code="5801",
            account_type="EXPENSE",
        )

        lines = [
            {
                "account_id": emi.bank_account_id,
                "entry_type": EntryType.CREDIT,
                "amount": emi.total_emi,
                "note": "EMI paid from bank",
            },
            {
                "account_id": emi.loan_account_id,
                "entry_type": EntryType.DEBIT,
                "amount": emi.principal_amount,
                "note": "Principal portion",
            },
        ]

        if emi.interest_amount > 0:
            lines.append({
                "account_id": interest_acc.id,
                "entry_type": EntryType.DEBIT,
                "amount": emi.interest_amount,
                "note": "Interest portion",
            })

        je = LedgerService.post_entry(
            date=emi.date,
            description=f"EMI Payment: {emi.loan_account.name}" +
                        (f" | {emi.reference}" if emi.reference else ""),
            source_type=SourceType.EMI,
            source_ref=emi.reference,
            user=user,
            lines=lines,
        )
        emi.journal_entry = je
        emi.save(update_fields=["journal_entry"])
