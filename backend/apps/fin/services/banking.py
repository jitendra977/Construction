"""
BankingService — handles deposits and cash transfers.
"""
import datetime
from decimal import Decimal

from django.db import transaction

from ..models.journal import EntryType, SourceType
from ..models.transfer import CashTransfer
from .ledger import LedgerService


class BankingService:

    @staticmethod
    @transaction.atomic
    def deposit(account, amount: Decimal, reference: str = "", user=None) -> None:
        """
        Record an opening balance or cash deposit into a bank/cash account.

        Journal:
          Debit  Bank Account          (asset increases)
          Credit Opening Balance Equity (equity increases)
        """
        equity = LedgerService.get_or_create_system_account(
            name="Opening Balance Equity",
            code="3000",
            account_type="EQUITY",
        )

        LedgerService.post_entry(
            date=datetime.date.today(),
            description=f"Deposit into {account.name}" + (f" | {reference}" if reference else ""),
            source_type=SourceType.DEPOSIT,
            source_ref=reference,
            project_id=account.project_id,
            user=user,
            lines=[
                {"account_id": account.id, "entry_type": EntryType.DEBIT,  "amount": amount},
                {"account_id": equity.id,  "entry_type": EntryType.CREDIT, "amount": amount},
            ],
        )

    @staticmethod
    @transaction.atomic
    def execute_transfer(transfer: CashTransfer, user=None) -> None:
        """
        Move money from one bank account to another.

        Journal:
          Debit  to_account   (receiving account increases)
          Credit from_account (sending account decreases)
        """
        if transfer.journal_entry_id:
            return  # already posted

        je = LedgerService.post_entry(
            date=transfer.date,
            description=f"Transfer: {transfer.from_account.name} → {transfer.to_account.name}" +
                        (f" | {transfer.reference}" if transfer.reference else ""),
            source_type=SourceType.TRANSFER,
            source_ref=transfer.reference,
            project_id=transfer.project_id,
            user=user,
            lines=[
                {"account_id": transfer.to_account_id,   "entry_type": EntryType.DEBIT,  "amount": transfer.amount},
                {"account_id": transfer.from_account_id, "entry_type": EntryType.CREDIT, "amount": transfer.amount},
            ],
        )
        transfer.journal_entry = je
        transfer.save(update_fields=["journal_entry"])
