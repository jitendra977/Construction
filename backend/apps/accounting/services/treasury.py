from django.db import transaction
from ..models.treasury import CashTransfer
from ..models.ledger import EntryType
from .ledger import LedgerService

class TreasuryService:
    @staticmethod
    @transaction.atomic
    def execute_transfer(transfer: CashTransfer):
        """
        Executes a cash transfer between two bank accounts.
        """
        if transfer.journal_entry:
            return  # Already executed
            
        lines = [
            # Debit the destination bank
            {
                "account_id": transfer.to_bank.gl_account_id,
                "entry_type": EntryType.DEBIT,
                "amount": transfer.amount
            },
            # Credit the source bank
            {
                "account_id": transfer.from_bank.gl_account_id,
                "entry_type": EntryType.CREDIT,
                "amount": transfer.amount
            }
        ]
        
        je = LedgerService.post_entry(
            date=transfer.date,
            description=f"Transfer from {transfer.from_bank} to {transfer.to_bank}: {transfer.reference or ''}",
            source_document=f"TX-{transfer.id}",
            lines=lines
        )
        
        transfer.journal_entry = je
        transfer.save()
