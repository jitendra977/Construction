"""
LedgerService — the only place that creates JournalEntry + JournalLine rows.

All other services (BankingService, LoanService, BillService) call this
to ensure every financial event is correctly recorded.
"""
import datetime
from decimal import Decimal
from typing import List, Dict, Any

from django.db import transaction
from django.core.exceptions import ValidationError

from ..models.journal import JournalEntry, JournalLine, EntryType, SourceType


class LedgerService:

    @staticmethod
    @transaction.atomic
    def post_entry(
        *,
        date: datetime.date,
        description: str,
        lines: List[Dict[str, Any]],
        source_type: str = SourceType.MANUAL,
        source_ref: str = "",
        project_id=None,
        user=None,
    ) -> JournalEntry:
        """
        Create a balanced JournalEntry.

        Parameters
        ----------
        lines : list of dicts
            Each dict must have:
              - account_id  : UUID of the Account
              - entry_type  : "DEBIT" or "CREDIT"
              - amount      : positive Decimal
            Optional:
              - note        : str

        Raises
        ------
        ValidationError if debits ≠ credits or amounts are non-positive.
        """
        if not lines:
            raise ValidationError("A journal entry must have at least two lines.")

        total_debit  = Decimal("0.00")
        total_credit = Decimal("0.00")

        for line in lines:
            amt = Decimal(str(line.get("amount", 0)))
            if amt <= 0:
                raise ValidationError("Each journal line amount must be positive.")
            if line["entry_type"] == EntryType.DEBIT:
                total_debit  += amt
            elif line["entry_type"] == EntryType.CREDIT:
                total_credit += amt
            else:
                raise ValidationError(f"Invalid entry_type: {line['entry_type']!r}. Use DEBIT or CREDIT.")

        if total_debit.quantize(Decimal("0.01")) != total_credit.quantize(Decimal("0.01")):
            raise ValidationError(
                f"Unbalanced entry: Debits ({total_debit}) ≠ Credits ({total_credit})."
            )

        je = JournalEntry.objects.create(
            date=date,
            description=description,
            source_type=source_type,
            source_ref=source_ref,
            project_id=project_id,
            created_by=user,
        )

        JournalLine.objects.bulk_create([
            JournalLine(
                journal_entry=je,
                account_id=line["account_id"],
                entry_type=line["entry_type"],
                amount=Decimal(str(line["amount"])),
                note=line.get("note", ""),
            )
            for line in lines
        ])

        return je

    @staticmethod
    @transaction.atomic
    def get_or_create_system_account(name: str, code: str, account_type: str) -> "Account":  # noqa
        """
        Ensures a system-level account exists (e.g. Opening Balance Equity, Interest Expense).
        """
        from ..models.account import Account
        acc, _ = Account.objects.get_or_create(
            name=name,
            defaults={"code": code, "account_type": account_type},
        )
        return acc
