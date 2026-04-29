import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class WageStructure(models.Model):
    """
    Per-worker wage configuration.

    Note: AttendanceWorker already stores daily_rate and overtime_rate_per_hour.
    WageStructure holds the *formal* payroll configuration (monthly salary,
    deductions, allowances) that may differ from the attendance daily rate.

    For simple labour: AttendanceWorker.daily_rate is enough.
    For salaried staff: use WageStructure for monthly / structured payroll.
    """

    class WageType(models.TextChoices):
        HOURLY   = 'hourly',   _('Hourly')
        DAILY    = 'daily',    _('Daily')
        MONTHLY  = 'monthly',  _('Monthly')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='wage_structures',
    )

    effective_from = models.DateField()
    effective_to   = models.DateField(
        null=True, blank=True,
        help_text=_('Leave blank if this is the current active structure.'),
    )

    wage_type     = models.CharField(max_length=10, choices=WageType.choices)
    base_amount   = models.DecimalField(max_digits=12, decimal_places=2)
    currency      = models.CharField(max_length=3, default='NPR')

    # Allowances
    allowance_transport = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    allowance_food      = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    allowance_housing   = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )
    allowance_other     = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
    )

    # Overtime (falls back to AttendanceWorker.effective_overtime_rate if 0)
    overtime_multiplier = models.DecimalField(
        max_digits=4, decimal_places=2, default=Decimal('1.50'),
        help_text=_('1.5 = 1.5× base hourly rate for overtime'),
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='wage_structures_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Wage Structure')
        verbose_name_plural = _('Wage Structures')
        ordering            = ['-effective_from']
        indexes = [
            models.Index(fields=['worker', 'effective_from']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — '
            f'{self.get_wage_type_display()} {self.base_amount} {self.currency}'
            f' (from {self.effective_from})'
        )

    @property
    def total_allowances(self):
        return (
            self.allowance_transport
            + self.allowance_food
            + self.allowance_housing
            + self.allowance_other
        )

    @property
    def gross_amount(self):
        return self.base_amount + self.total_allowances


class PayrollRecord(models.Model):
    """
    Payroll calculation for a worker over a pay period.

    Data sources:
    ─ Base pay      ← WageStructure.base_amount OR AttendanceWorker.daily_rate
    ─ Days worked   ← DailyAttendance.effective_days (SUM over period)
    ─ Overtime      ← DailyAttendance.overtime_hours (SUM over period)
    ─ Rate snapshot ← DailyAttendance.daily_rate_snapshot (already captured!)

    Use PayrollService (services/payroll_service.py) to generate these;
    don't create them manually.
    """

    class Status(models.TextChoices):
        DRAFT    = 'draft',    _('Draft')
        APPROVED = 'approved', _('Approved')
        PAID     = 'paid',     _('Paid')
        VOID     = 'void',     _('Void')

    class PaymentMethod(models.TextChoices):
        CASH        = 'cash',        _('Cash')
        BANK        = 'bank',        _('Bank Transfer')
        MOBILE_PAY  = 'mobile_pay',  _('Mobile Payment')
        CHEQUE      = 'cheque',      _('Cheque')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='payroll_records',
    )
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payroll_records',
    )

    # ── Pay period ────────────────────────────────────────────
    period_start = models.DateField()
    period_end   = models.DateField()

    # ── Attendance summary (copied from DailyAttendance aggregation) ──
    total_days_present  = models.DecimalField(
        max_digits=6, decimal_places=1, default=0,
        help_text=_('Sum of effective_days from DailyAttendance.'),
    )
    total_days_absent   = models.PositiveSmallIntegerField(default=0)
    total_days_leave    = models.PositiveSmallIntegerField(default=0)
    total_days_holiday  = models.PositiveSmallIntegerField(default=0)
    total_overtime_hours = models.DecimalField(
        max_digits=7, decimal_places=2, default=0,
        help_text=_('Sum of overtime_hours from DailyAttendance.'),
    )

    # ── Earnings ──────────────────────────────────────────────
    base_pay      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    overtime_pay  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    allowances    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    bonus         = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # ── Deductions ────────────────────────────────────────────
    deduction_tax     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deduction_advance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deduction_other   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deduction_notes   = models.TextField(blank=True)

    # ── Net ───────────────────────────────────────────────────
    net_pay  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='NPR')

    # ── Payment ───────────────────────────────────────────────
    status         = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT,
    )
    paid_date      = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=15, choices=PaymentMethod.choices, blank=True,
    )
    payment_reference = models.CharField(max_length=100, blank=True)

    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='payroll_approvals',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='payroll_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Payroll Record')
        verbose_name_plural = _('Payroll Records')
        ordering            = ['-period_end']
        unique_together     = [('worker', 'period_start', 'period_end')]
        indexes = [
            models.Index(fields=['worker', 'status']),
            models.Index(fields=['period_start', 'period_end']),
            models.Index(fields=['project', 'period_end']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — '
            f'{self.period_start} to {self.period_end} — '
            f'{self.net_pay} {self.currency} [{self.get_status_display()}]'
        )

    @property
    def gross_earnings(self):
        return self.base_pay + self.overtime_pay + self.allowances + self.bonus

    @property
    def total_deductions(self):
        return self.deduction_tax + self.deduction_advance + self.deduction_other

    def calculate_net(self):
        """Recalculate and store net_pay from components."""
        self.net_pay = self.gross_earnings - self.total_deductions
        return self.net_pay

    def populate_from_attendance(self):
        """
        Aggregate DailyAttendance for this worker + project + period
        and populate the attendance summary fields.

        Call this before saving a new PayrollRecord:
            record.populate_from_attendance()
            record.calculate_net()
            record.save()
        """
        from django.db.models import Sum, Count
        from apps.attendance.models import DailyAttendance

        aw = self.worker.attendance_worker
        if not aw:
            return

        qs = DailyAttendance.objects.filter(
            worker=aw,
            date__range=(self.period_start, self.period_end),
        )
        if self.project:
            qs = qs.filter(project=self.project)

        agg = qs.aggregate(total_ot=Sum('overtime_hours'))

        # Tally effective_days manually (computed property, not a DB field)
        present = Decimal('0')
        absent = leave = holiday = 0
        for rec in qs.only('status', 'overtime_hours', 'daily_rate_snapshot'):
            if rec.status == 'PRESENT':
                present += Decimal('1')
            elif rec.status == 'HALF_DAY':
                present += Decimal('0.5')
            elif rec.status == 'ABSENT':
                absent += 1
            elif rec.status == 'LEAVE':
                leave += 1
            elif rec.status == 'HOLIDAY':
                holiday += 1

        self.total_days_present   = present
        self.total_days_absent    = absent
        self.total_days_leave     = leave
        self.total_days_holiday   = holiday
        self.total_overtime_hours = agg['total_ot'] or Decimal('0')

        # Base pay using snapshot rates from DailyAttendance
        # (already captured at record creation — immutable)
        base = Decimal('0')
        for rec in qs.only('status', 'daily_rate_snapshot', 'overtime_rate_snapshot', 'overtime_hours'):
            base += rec.wage_earned   # uses the property from DailyAttendance
        self.base_pay      = base
        self.overtime_pay  = Decimal('0')   # already included in wage_earned
