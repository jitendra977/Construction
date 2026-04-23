from django.db import transaction
from ..models.payables import VendorBill, BillPayment
from ..models.ledger import EntryType, Account
from .ledger import LedgerService

class PayableService:
    @staticmethod
    @transaction.atomic
    def post_bill(bill: VendorBill):
        """
        Records a vendor bill to the ledger.
        Debit: Expense Account
        Credit: Accounts Payable
        """
        if bill.journal_entry:
            return
            
        ap_account = Account.objects.filter(code="2000").first()
        if not ap_account:
            raise ValueError("Accounts Payable account (code 2000) not found.")
            
        lines = [
            {
                "account_id": bill.expense_account_id,
                "entry_type": EntryType.DEBIT,
                "amount": bill.amount,
                "project_id": bill.project_id,
                "phase_id": bill.phase_id
            },
            {
                "account_id": ap_account.id,
                "entry_type": EntryType.CREDIT,
                "amount": bill.amount
            }
        ]
        
        je = LedgerService.post_entry(
            date=bill.date,
            description=f"Bill {bill.invoice_number} from {bill.vendor.name}: {bill.description}",
            source_document=f"BILL-{bill.id}",
            lines=lines
        )
        
        bill.journal_entry = je
        bill.save()

    @staticmethod
    @transaction.atomic
    def post_payment(payment: BillPayment):
        """
        Records a payment for a bill.
        Debit: Accounts Payable
        Credit: Bank Account
        """
        if payment.journal_entry:
            return
            
        ap_account = Account.objects.filter(code="2000").first()
        if not ap_account:
            raise ValueError("Accounts Payable account (code 2000) not found.")
            
        lines = [
            {
                "account_id": ap_account.id,
                "entry_type": EntryType.DEBIT,
                "amount": payment.amount
            },
            {
                "account_id": payment.bank_account.gl_account_id,
                "entry_type": EntryType.CREDIT,
                "amount": payment.amount
            }
        ]
        
        je = LedgerService.post_entry(
            date=payment.date,
            description=f"Payment for Bill {payment.bill.invoice_number} via {payment.bank_account.name}",
            source_document=f"PMT-{payment.id}",
            lines=lines
        )
        
        payment.journal_entry = je
        payment.save()
