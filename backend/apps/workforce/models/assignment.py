import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class WorkerAssignment(models.Model):
    """
    Links a WorkforceMember to a project/task for a scheduled date range.

    Attendance integration:
    - actual_hours is populated from DailyAttendance records at completion.
    - To get real-time hours worked:
        DailyAttendance.objects.filter(
            worker=self.worker.attendance_worker,
            project=self.project,
            date__range=(self.start_date, self.end_date),
        ).aggregate(total=Sum('effective_days'))
    """

    class Status(models.TextChoices):
        SCHEDULED = 'scheduled', _('Scheduled')
        ACTIVE    = 'active',    _('Active')
        COMPLETED = 'completed', _('Completed')
        CANCELLED = 'cancelled', _('Cancelled')
        ON_HOLD   = 'on_hold',   _('On Hold')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='assignments',
    )

    # ── Project scope ─────────────────────────────────────────
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.CASCADE,
        related_name='worker_assignments',
    )

    # ── Schedule ──────────────────────────────────────────────
    start_date = models.DateField()
    end_date   = models.DateField(null=True, blank=True)
    status     = models.CharField(
        max_length=15, choices=Status.choices, default=Status.SCHEDULED,
    )

    # ── Role on this assignment (can differ from worker's default) ────
    role_override = models.ForeignKey(
        'workforce.WorkforceRole',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text=_('Override role for this specific assignment.'),
    )

    # ── Hours ─────────────────────────────────────────────────
    estimated_days = models.DecimalField(
        max_digits=6, decimal_places=1,
        null=True, blank=True,
        help_text=_('Planned working days for this assignment.'),
    )
    actual_days = models.DecimalField(
        max_digits=6, decimal_places=1,
        null=True, blank=True,
        help_text=_(
            'Filled from DailyAttendance on completion. '
            'Sum of effective_days (Present=1, Half-Day=0.5).'
        ),
    )
    overtime_hours = models.DecimalField(
        max_digits=6, decimal_places=2,
        default=0,
        help_text=_('Total overtime hours pulled from DailyAttendance records.'),
    )

    notes       = models.TextField(blank=True)
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='assignments_created',
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Worker Assignment')
        verbose_name_plural = _('Worker Assignments')
        ordering            = ['start_date', 'worker']
        indexes = [
            models.Index(fields=['worker', 'status']),
            models.Index(fields=['project', 'start_date']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def __str__(self):
        end = self.end_date or 'ongoing'
        return f'{self.worker.full_name} → {self.project} ({self.start_date} ~ {end})'

    @property
    def duration_days(self):
        if self.end_date:
            return (self.end_date - self.start_date).days + 1
        return None

    @property
    def days_variance(self):
        """Positive = over estimate, negative = under."""
        if self.estimated_days and self.actual_days:
            return float(self.actual_days) - float(self.estimated_days)
        return None

    def sync_actual_days(self):
        """
        Pull actual_days and overtime_hours from DailyAttendance records.
        Call this when marking an assignment COMPLETED.

        Example usage in a view or signal:
            assignment.sync_actual_days()
            assignment.save(update_fields=['actual_days', 'overtime_hours'])
        """
        from decimal import Decimal
        from django.db.models import Sum
        from apps.attendance.models import DailyAttendance

        aw = self.worker.attendance_worker
        if not aw:
            return

        qs = DailyAttendance.objects.filter(
            worker=aw,
            project=self.project,
        )
        if self.start_date:
            qs = qs.filter(date__gte=self.start_date)
        if self.end_date:
            qs = qs.filter(date__lte=self.end_date)

        totals = qs.aggregate(
            ot=Sum('overtime_hours'),
        )

        # Compute effective_days manually (property, not a DB field)
        effective = Decimal('0')
        for record in qs.only('status'):
            if record.status == 'PRESENT':
                effective += Decimal('1')
            elif record.status == 'HALF_DAY':
                effective += Decimal('0.5')

        self.actual_days    = effective
        self.overtime_hours = totals['ot'] or Decimal('0')
