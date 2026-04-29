import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings


def document_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return (
        f'workforce/documents/'
        f'{instance.worker.employee_id}/{instance.doc_type}/{uuid.uuid4()}.{ext}'
    )


def contract_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return f'workforce/contracts/{instance.worker.employee_id}/{uuid.uuid4()}.{ext}'


class WorkerDocument(models.Model):
    """
    KYC documents, permits, licenses, insurance.
    Tracks expiry and admin verification status.
    """

    class DocType(models.TextChoices):
        NATIONAL_ID  = 'national_id',  _('National ID')
        PASSPORT     = 'passport',     _('Passport')
        WORK_PERMIT  = 'work_permit',  _('Work Permit')
        HEALTH_CARD  = 'health_card',  _('Health Card')
        INSURANCE    = 'insurance',    _('Insurance')
        DRIVING_LIC  = 'driving_lic',  _('Driving License')
        TRADE_LIC    = 'trade_lic',    _('Trade License')
        SAFETY_CERT  = 'safety_cert',  _('Safety Certificate')
        TAX_ID       = 'tax_id',       _('Tax ID / PAN')
        BANK_ACCOUNT = 'bank_account', _('Bank Account')
        OTHER        = 'other',        _('Other')

    class VerifyStatus(models.TextChoices):
        PENDING  = 'pending',  _('Pending')
        VERIFIED = 'verified', _('Verified')
        REJECTED = 'rejected', _('Rejected')
        EXPIRED  = 'expired',  _('Expired')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='documents',
    )

    doc_type           = models.CharField(max_length=20, choices=DocType.choices)
    doc_number         = models.CharField(max_length=100, blank=True)
    file               = models.FileField(upload_to=document_upload_path)
    issued_date        = models.DateField(null=True, blank=True)
    expiry_date        = models.DateField(null=True, blank=True)
    issuing_authority  = models.CharField(max_length=200, blank=True)

    # ── Verification ──────────────────────────────────────────
    verify_status = models.CharField(
        max_length=10,
        choices=VerifyStatus.choices,
        default=VerifyStatus.PENDING,
    )
    verified_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='document_verifications',
    )
    verified_date = models.DateField(null=True, blank=True)
    reject_reason = models.TextField(blank=True)

    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Worker Document')
        verbose_name_plural = _('Worker Documents')
        ordering            = ['-created_at']
        indexes = [
            models.Index(fields=['worker', 'doc_type']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['verify_status']),
        ]

    def __str__(self):
        return f'{self.worker.full_name} — {self.get_doc_type_display()}'

    @property
    def is_expired(self):
        if self.expiry_date:
            return self.expiry_date < timezone.now().date()
        return False

    @property
    def days_until_expiry(self):
        if self.expiry_date:
            return (self.expiry_date - timezone.now().date()).days
        return None

    @property
    def is_expiring_soon(self):
        d = self.days_until_expiry
        return d is not None and 0 <= d <= 30


class WorkerContract(models.Model):
    """
    Employment / subcontract agreements with wage terms.
    A worker may have multiple contracts over time; only one should be ACTIVE.

    Integration note: wage_amount here is the agreed contract rate.
    The actual daily_rate used for payroll calculations lives on
    AttendanceWorker (auto-set from this contract via signal if desired).
    """

    class ContractType(models.TextChoices):
        PERMANENT   = 'permanent',   _('Permanent')
        FIXED_TERM  = 'fixed_term',  _('Fixed Term')
        DAILY       = 'daily',       _('Daily Hire')
        SUBCONTRACT = 'subcontract', _('Subcontract')
        PROBATION   = 'probation',   _('Probation')

    class WageType(models.TextChoices):
        HOURLY   = 'hourly',   _('Hourly')
        DAILY    = 'daily',    _('Daily')
        MONTHLY  = 'monthly',  _('Monthly')
        LUMP_SUM = 'lump_sum', _('Lump Sum')

    class Status(models.TextChoices):
        DRAFT      = 'draft',      _('Draft')
        ACTIVE     = 'active',     _('Active')
        EXPIRED    = 'expired',    _('Expired')
        TERMINATED = 'terminated', _('Terminated')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='contracts',
    )

    contract_type = models.CharField(max_length=20, choices=ContractType.choices)
    status        = models.CharField(
        max_length=15, choices=Status.choices, default=Status.DRAFT,
    )

    # ── Dates ─────────────────────────────────────────────────
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)

    # ── Wage ──────────────────────────────────────────────────
    wage_type     = models.CharField(max_length=10, choices=WageType.choices)
    wage_amount   = models.DecimalField(max_digits=12, decimal_places=2)
    currency      = models.CharField(max_length=3, default='NPR')
    overtime_rate = models.DecimalField(
        max_digits=4, decimal_places=2, default=1.50,
        help_text=_('Multiplier e.g. 1.5 = 1.5× normal rate'),
    )

    # ── Project scope ─────────────────────────────────────────
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='workforce_contracts',
    )

    # ── Document ──────────────────────────────────────────────
    signed_copy = models.FileField(
        upload_to=contract_upload_path, null=True, blank=True,
    )
    signed_date = models.DateField(null=True, blank=True)
    terms_notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='contracts_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Worker Contract')
        verbose_name_plural = _('Worker Contracts')
        ordering            = ['-start_date']
        indexes = [
            models.Index(fields=['worker', 'status']),
            models.Index(fields=['end_date']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — '
            f'{self.get_contract_type_display()} ({self.start_date})'
        )

    @property
    def is_active(self):
        today = timezone.now().date()
        if self.end_date:
            return self.start_date <= today <= self.end_date
        return self.start_date <= today

    @property
    def duration_days(self):
        if self.end_date:
            return (self.end_date - self.start_date).days
        return None
