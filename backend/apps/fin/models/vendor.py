"""
Vendor — supplier / sub-contractor entity used across payables.

This model reuses the existing `accounting_vendor` DB table via db_table,
so no data migration is required when retiring the accounting app.
"""
import uuid
from django.db import models


class Vendor(models.Model):
    id             = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name           = models.CharField(max_length=255)
    phone          = models.CharField(max_length=50, blank=True, null=True)
    address        = models.CharField(max_length=500, blank=True, null=True)
    pan_number     = models.CharField(max_length=20, blank=True, null=True,
                                      help_text="PAN/VAT registration number")
    category       = models.CharField(max_length=50, blank=True, null=True,
                                      help_text="e.g. Civil Contractor, Electrical, Material Supplier, Labor")
    contact_person = models.CharField(max_length=100, blank=True, null=True)
    email          = models.EmailField(blank=True, null=True)
    photo          = models.ImageField(upload_to='vendors/', null=True, blank=True)
    bank_name      = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    branch         = models.CharField(max_length=100, blank=True, null=True)
    is_active      = models.BooleanField(default=True)

    class Meta:
        app_label = "fin"
        db_table  = "accounting_vendor"   # reuse existing table — no data migration needed
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"

    def __str__(self):
        return self.name
