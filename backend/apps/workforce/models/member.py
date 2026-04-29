import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


def worker_photo_upload(instance, filename):
    ext = filename.split('.')[-1]
    return f'workforce/photos/{instance.employee_id}.{ext}'


class WorkforceMember(models.Model):
    """
    Core identity record for every worker in the system.

    Integration points:
    ─ accounts.User              → OneToOne (nullable; day labourers may have no login)
    ─ attendance.AttendanceWorker → OneToOne (nullable; linked after attendance record created)
    ─ core.HouseProject           → FK for current site

    Rule: do NOT duplicate trade, daily_rate, phone, or qr_token here.
    Those fields live on AttendanceWorker. Access them via:
        member.attendance_worker.daily_rate
        member.attendance_worker.qr_token
    """

    class WorkerType(models.TextChoices):
        LABOUR        = 'LABOUR',        _('Daily Labour')
        STAFF         = 'STAFF',         _('Salaried Staff')
        SUBCONTRACTOR = 'SUBCONTRACTOR', _('Subcontractor')
        FREELANCE     = 'FREELANCE',     _('Freelance')

    class Status(models.TextChoices):
        ACTIVE      = 'ACTIVE',      _('Active')
        INACTIVE    = 'INACTIVE',    _('Inactive')
        ON_LEAVE    = 'ON_LEAVE',    _('On Leave')
        SUSPENDED   = 'SUSPENDED',   _('Suspended')
        BLACKLISTED = 'BLACKLISTED', _('Blacklisted')
        TERMINATED  = 'TERMINATED',  _('Terminated')

    class Gender(models.TextChoices):
        MALE   = 'M', _('Male')
        FEMALE = 'F', _('Female')
        OTHER  = 'O', _('Other')

    # ── Primary key ───────────────────────────────────────────
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # ── Account link (nullable) ───────────────────────────────
    account = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workforce_profile',
    )

    # ── Attendance app bridge ─────────────────────────────────
    attendance_worker = models.OneToOneField(
        'attendance.AttendanceWorker',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='workforce_member',
        help_text=_(
            'Linked attendance record. Provides QR token, daily_rate, '
            'trade, and all check-in/out history.'
        ),
    )

    # ── Auto employee ID ──────────────────────────────────────
    employee_id = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        help_text=_('Auto-generated: WF-YYYY-NNNN'),
    )

    # ── Personal info (Smart properties below override these) ──
    _first_name = models.CharField(max_length=100, db_column='first_name')
    _last_name  = models.CharField(max_length=100, db_column='last_name')
    gender      = models.CharField(max_length=1, choices=Gender.choices, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    _photo      = models.ImageField(upload_to=worker_photo_upload, null=True, blank=True, db_column='photo')
    nationality = models.CharField(max_length=100, blank=True)
    language    = models.CharField(max_length=100, blank=True)

    # ── Contact ───────────────────────────────────────────────
    _phone     = models.CharField(max_length=20, blank=True, db_column='phone')
    phone_alt  = models.CharField(max_length=20, blank=True)
    _email     = models.EmailField(blank=True, db_column='email')
    address    = models.TextField(blank=True)

    # ── Classification ────────────────────────────────────────
    worker_type = models.CharField(
        max_length=20, choices=WorkerType.choices, default=WorkerType.LABOUR,
    )
    role = models.ForeignKey(
        'workforce.WorkforceRole',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='members',
    )
    status = models.CharField(
        max_length=15, choices=Status.choices, default=Status.ACTIVE,
    )

    # ── Employment dates ──────────────────────────────────────
    join_date = models.DateField()
    end_date  = models.DateField(null=True, blank=True)

    # ── Current site (mirrors AttendanceWorker.project) ───────
    current_project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='workforce_members',
    )

    # ── Audit ─────────────────────────────────────────────────
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='workforce_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Workforce Member')
        verbose_name_plural = _('Workforce Members')
        ordering            = ['_first_name', '_last_name']
        indexes = [
            models.Index(fields=['employee_id']),
            models.Index(fields=['status']),
            models.Index(fields=['worker_type']),
            models.Index(fields=['current_project', 'status']),
        ]

    def __str__(self):
        return f'{self.full_name} ({self.employee_id})'

    # ── Smart Properties (Prefer User account data) ───────────

    @property
    def first_name(self):
        if self.account:
            return self.account.first_name
        return self._first_name

    @first_name.setter
    def first_name(self, value):
        self._first_name = value

    @property
    def last_name(self):
        if self.account:
            return self.account.last_name
        return self._last_name

    @last_name.setter
    def last_name(self, value):
        self._last_name = value

    @property
    def email(self):
        if self.account:
            return self.account.email
        return self._email

    @email.setter
    def email(self, value):
        self._email = value

    @property
    def phone(self):
        if self.account:
            return self.account.phone_number
        return self._phone

    @phone.setter
    def phone(self, value):
        self._phone = value

    @property
    def photo(self):
        if self.account:
            return self.account.profile_image
        return self._photo

    @photo.setter
    def photo(self, value):
        self._photo = value

    # ── Other Properties ──────────────────────────────────────

    @property
    def full_name(self):
        return f'{self.first_name} {self.last_name}'.strip()

    @property
    def is_active(self):
        return self.status == self.Status.ACTIVE

    @property
    def has_attendance_link(self):
        return self.attendance_worker_id is not None

    @property
    def daily_rate(self):
        if self.attendance_worker_id:
            return self.attendance_worker.daily_rate
        return None

    @property
    def qr_token(self):
        if self.attendance_worker_id:
            return self.attendance_worker.qr_token
        return None

    @property
    def effective_trade(self):
        if self.attendance_worker_id:
            return self.attendance_worker.get_trade_display()
        return self.role.title if self.role else '—'

    # ── Save ──────────────────────────────────────────────────

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = self._generate_employee_id()
        super().save(*args, **kwargs)

    def _generate_employee_id(self):
        from django.utils import timezone
        year = timezone.now().year
        last = (
            WorkforceMember.objects
            .filter(employee_id__startswith=f'WF-{year}-')
            .order_by('employee_id')
            .last()
        )
        seq = int(last.employee_id.split('-')[-1]) + 1 if last else 1
        return f'WF-{year}-{seq:04d}'
