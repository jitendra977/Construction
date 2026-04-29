import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class EmergencyContact(models.Model):
    """Emergency contacts per worker. One marked primary."""

    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker       = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='emergency_contacts',
    )
    name         = models.CharField(max_length=150)
    relationship = models.CharField(
        max_length=50, help_text=_('e.g. Spouse, Parent, Sibling')
    )
    phone        = models.CharField(max_length=20)
    phone_alt    = models.CharField(max_length=20, blank=True)
    address      = models.TextField(blank=True)
    is_primary   = models.BooleanField(default=False)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Emergency Contact')
        verbose_name_plural = _('Emergency Contacts')
        ordering            = ['-is_primary', 'name']

    def __str__(self):
        tag = ' [Primary]' if self.is_primary else ''
        return f'{self.name} ({self.relationship}) → {self.worker.full_name}{tag}'

    def save(self, *args, **kwargs):
        if self.is_primary:
            # Enforce single primary per worker
            EmergencyContact.objects.filter(
                worker=self.worker, is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)


class SafetyRecord(models.Model):
    """
    Incident, violation, and near-miss log.
    Critical for construction site compliance.
    """

    class IncidentType(models.TextChoices):
        NEAR_MISS    = 'near_miss',    _('Near Miss')
        MINOR_INJURY = 'minor_injury', _('Minor Injury')
        MAJOR_INJURY = 'major_injury', _('Major Injury')
        PROPERTY_DMG = 'property_dmg', _('Property Damage')
        VIOLATION    = 'violation',    _('Safety Violation')
        FATALITY     = 'fatality',     _('Fatality')

    class Severity(models.TextChoices):
        LOW      = 'low',      _('Low')
        MEDIUM   = 'medium',   _('Medium')
        HIGH     = 'high',     _('High')
        CRITICAL = 'critical', _('Critical')

    class Status(models.TextChoices):
        OPEN          = 'open',          _('Open')
        INVESTIGATING = 'investigating', _('Under Investigation')
        RESOLVED      = 'resolved',      _('Resolved')
        CLOSED        = 'closed',        _('Closed')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='safety_records',
    )
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='safety_records',
    )

    incident_type  = models.CharField(max_length=20, choices=IncidentType.choices)
    severity       = models.CharField(max_length=10, choices=Severity.choices)
    status         = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN,
    )

    incident_date  = models.DateField()
    incident_time  = models.TimeField(null=True, blank=True)
    location       = models.CharField(max_length=200, blank=True)
    description    = models.TextField()
    action_taken   = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)

    # ── Evidence ──────────────────────────────────────────────
    photo_1 = models.ImageField(upload_to='workforce/safety/', null=True, blank=True)
    photo_2 = models.ImageField(upload_to='workforce/safety/', null=True, blank=True)

    # ── QR scan log link ──────────────────────────────────────
    # If the incident was tied to a specific check-in/out scan, link it here.
    # Useful for timestamping exactly when on site the incident occurred.
    qr_scan_log = models.ForeignKey(
        'attendance.QRScanLog',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='safety_records',
        help_text=_('Optional: QR scan event at time of incident.'),
    )

    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='safety_reports',
    )
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='safety_resolutions',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Safety Record')
        verbose_name_plural = _('Safety Records')
        ordering            = ['-incident_date', '-severity']
        indexes = [
            models.Index(fields=['worker', 'severity']),
            models.Index(fields=['incident_date']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — {self.get_incident_type_display()} '
            f'({self.incident_date}) [{self.get_severity_display()}]'
        )


class PerformanceLog(models.Model):
    """
    Structured performance entry logged by a supervisor.
    Multiple entries build a worker's performance history.
    """

    class Category(models.TextChoices):
        PUNCTUALITY  = 'punctuality',  _('Punctuality')
        QUALITY      = 'quality',      _('Work Quality')
        SAFETY       = 'safety',       _('Safety Compliance')
        TEAMWORK     = 'teamwork',     _('Teamwork')
        PRODUCTIVITY = 'productivity', _('Productivity')
        ATTITUDE     = 'attitude',     _('Attitude')

    class Rating(models.IntegerChoices):
        POOR          = 1, _('Poor')
        BELOW_AVERAGE = 2, _('Below Average')
        AVERAGE       = 3, _('Average')
        GOOD          = 4, _('Good')
        EXCELLENT     = 5, _('Excellent')

    id      = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker  = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='performance_logs',
    )
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='performance_logs',
    )

    log_date  = models.DateField()
    category  = models.CharField(max_length=20, choices=Category.choices)
    rating    = models.PositiveSmallIntegerField(choices=Rating.choices)
    notes     = models.TextField(blank=True)

    # ── Attendance context ────────────────────────────────────
    # Optionally tie this log to the attendance record for that day.
    daily_attendance = models.ForeignKey(
        'attendance.DailyAttendance',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='performance_logs',
        help_text=_('Attendance record for the day this log was created.'),
    )

    logged_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='performance_logs_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Performance Log')
        verbose_name_plural = _('Performance Logs')
        ordering            = ['-log_date']
        indexes = [
            models.Index(fields=['worker', 'category']),
            models.Index(fields=['log_date']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — {self.get_category_display()} '
            f'{self.rating}/5 ({self.log_date})'
        )
