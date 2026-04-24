from  apps.core.models import ConstructionPhase , HouseProject
import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings

from .payables import Vendor

class ContractorPaymentRequest(models.Model):
    """
    A payment claim from a contractor/vendor for work completed.
    This generates a VendorBill in AP upon approval.
    """
    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(HouseProject, on_delete=models.CASCADE, related_name="payment_requests")
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.CASCADE, related_name="payment_requests")
    contractor = models.ForeignKey(Vendor, on_delete=models.PROTECT, related_name="payment_requests")
    
    date_submitted = models.DateField(auto_now_add=True)
    description = models.CharField(max_length=500)
    
    work_completion_percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="Percentage of phase completed")
    claimed_amount = models.DecimalField(max_digits=15, decimal_places=2)
    retention_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), help_text="Amount withheld")
    net_payable = models.DecimalField(max_digits=15, decimal_places=2, help_text="Claimed - Retention")
    
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    approved_date = models.DateField(null=True, blank=True)
    
    # Linked to the actual bill that gets generated when approved
    vendor_bill = models.OneToOneField('accounting.VendorBill', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Linked to finance module's bill payment
    finance_bill_payment = models.OneToOneField('finance.BillPayment', on_delete=models.SET_NULL, null=True, blank=True, related_name='contractor_payment_request')

    def __str__(self):
        return f"Payment Request from {self.contractor} for {self.phase.name}"

class RetentionRelease(models.Model):
    """
    Release of withheld retention money back to the contractor.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment_request = models.ForeignKey(ContractorPaymentRequest, on_delete=models.CASCADE, related_name="retention_releases")
    date = models.DateField()
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    notes = models.CharField(max_length=500, blank=True)
    
    # Linked to the bill generated for this release
    vendor_bill = models.OneToOneField('accounting.VendorBill', on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Retention Release {self.amount} for {self.payment_request}"
