from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError
from decimal import Decimal
from typing import List, Dict, Any
import datetime

from ..models.ledger import JournalEntry, JournalLine, Account, EntryType

class LedgerService:
    @staticmethod
    @transaction.atomic
    def post_entry(date: datetime.date, description: str, lines: List[Dict[str, Any]], source_document: str = None) -> JournalEntry:
        """
        Creates a JournalEntry and its lines.
        Enforces strict debit == credit rules.
        `lines` format: [{"account_id": UUID, "entry_type": EntryType, "amount": Decimal, ...}]
        """
        if not lines:
            raise ValidationError("Journal entry must have lines.")
        
        total_debit = Decimal("0.00")
        total_credit = Decimal("0.00")
        
        for line in lines:
            amt = Decimal(str(line.get("amount", 0)))
            if amt <= 0:
                raise ValidationError("Line amounts must be positive.")
            if line["entry_type"] == EntryType.DEBIT:
                total_debit += amt
            elif line["entry_type"] == EntryType.CREDIT:
                total_credit += amt
            else:
                raise ValidationError("Invalid entry type.")
                
        if total_debit != total_credit:
            raise ValidationError(f"Unbalanced entry: Debits ({total_debit}) != Credits ({total_credit}).")
            
        je = JournalEntry.objects.create(
            date=date,
            description=description,
            source_document=source_document
        )
        
        for line in lines:
            JournalLine.objects.create(
                journal_entry=je,
                account_id=line["account_id"],
                entry_type=line["entry_type"],
                amount=Decimal(str(line["amount"])),
                project_id=line.get("project_id"),
                phase_id=line.get("phase_id")
            )
            
        return je
        
    @staticmethod
    @transaction.atomic
    def reverse_entry(journal_entry: JournalEntry):
        """
        Reverses a journal entry by posting the opposite amounts.
        """
        new_lines = []
        for line in journal_entry.lines.all():
            new_type = EntryType.CREDIT if line.entry_type == EntryType.DEBIT else EntryType.DEBIT
            new_lines.append({
                "account_id": line.account_id,
                "entry_type": new_type,
                "amount": line.amount,
                "project_id": line.project_id,
                "phase_id": line.phase_id
            })
            
        return LedgerService.post_entry(
            date=datetime.date.today(),
            description=f"Reversal of JE-{journal_entry.id}",
            source_document=f"REV-{journal_entry.id}",
            lines=new_lines
        )
