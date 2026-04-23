import datetime
from django.db import transaction
from django.core.exceptions import ValidationError
from ..models.construction import ContractorPaymentRequest, RetentionRelease
from ..models.payables import VendorBill
from ..models.ledger import Account

class ConstructionService:
    @staticmethod
    @transaction.atomic
    def approve_payment_request(request_id, user):
        """
        Approves a ContractorPaymentRequest and generates a VendorBill in AP.
        """
        req = ContractorPaymentRequest.objects.select_related('contractor', 'project', 'phase').get(id=request_id)
        
        if req.status != ContractorPaymentRequest.Status.PENDING:
            raise ValidationError("Payment request must be in PENDING status to approve.")
            
        # Ensure we have an expense account (Default to 5000: Project Expenses)
        expense_acc = Account.objects.filter(code="5000").first()
        if not expense_acc:
            raise ValidationError("Expense account 5000 not found.")
            
        # Create the AP Bill for the NET amount payable
        bill = VendorBill.objects.create(
            vendor=req.contractor,
            date=datetime.date.today(),
            due_date=datetime.date.today() + datetime.timedelta(days=7),
            invoice_number=f"PR-{req.id.hex[:6].upper()}",
            description=f"Payment Request: {req.phase.name} ({req.work_completion_percentage}%)",
            amount=req.net_payable,
            expense_account=expense_acc,
            project=req.project,
            phase=req.phase
        )
        
        # Link the bill back and mark approved
        req.vendor_bill = bill
        req.status = ContractorPaymentRequest.Status.APPROVED
        req.approved_by = user
        req.approved_date = datetime.date.today()
        req.save()
        
        # We don't automatically pay the bill here; the PayableService handles bill payment.
        # But creating the VendorBill ensures it hits the GL (Debit Expense, Credit AP) via PayableService's signals/logic.
        # Wait, in the current PayableService, post_bill must be called explicitly!
        from .payables import PayableService
        PayableService.post_bill(bill)
        
        return req
