"""
data_transfer.models
────────────────────
ImportJob — tracks every CSV/Excel bulk import attempt so admins can audit
what was loaded, by whom, and whether rows were skipped.
"""

from django.db import models
from django.conf import settings


class ImportJob(models.Model):

    IMPORT_TYPE_CHOICES = [
        ('workforce',   'Workforce Members'),
        ('materials',   'Materials / Inventory'),
        ('attendance',  'Attendance Records'),
        ('suppliers',   'Suppliers'),
    ]

    STATUS_CHOICES = [
        ('pending',    'Pending'),
        ('dry_run',    'Dry Run'),
        ('importing',  'Importing'),
        ('done',       'Done'),
        ('failed',     'Failed'),
    ]

    # ── Identity ──────────────────────────────────────────────────────────────
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.CASCADE,
        related_name='import_jobs',
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='import_jobs',
    )

    # ── File info ─────────────────────────────────────────────────────────────
    import_type  = models.CharField(max_length=32, choices=IMPORT_TYPE_CHOICES)
    file_name    = models.CharField(max_length=255)
    file_format  = models.CharField(max_length=8, default='csv')  # csv | xlsx

    # ── Status ────────────────────────────────────────────────────────────────
    status       = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')

    # ── Row counts ────────────────────────────────────────────────────────────
    rows_total    = models.PositiveIntegerField(default=0)
    rows_imported = models.PositiveIntegerField(default=0)
    rows_skipped  = models.PositiveIntegerField(default=0)
    rows_failed   = models.PositiveIntegerField(default=0)

    # ── Error / warning log stored as JSON list of {row, message} dicts ──────
    error_log = models.JSONField(default=list, blank=True)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at   = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name      = 'Import Job'
        verbose_name_plural = 'Import Jobs'

    def __str__(self):
        return f"{self.import_type} import by {self.created_by} ({self.status})"

    def mark_done(self, imported, skipped, failed, errors):
        from django.utils import timezone
        self.status       = 'done' if failed == 0 else 'done'
        self.rows_imported = imported
        self.rows_skipped  = skipped
        self.rows_failed   = failed
        self.error_log     = errors[:200]   # cap at 200 entries
        self.completed_at  = timezone.now()
        self.save(update_fields=[
            'status', 'rows_imported', 'rows_skipped',
            'rows_failed', 'error_log', 'completed_at',
        ])

    def mark_failed(self, reason):
        from django.utils import timezone
        self.status       = 'failed'
        self.error_log    = [{'row': 0, 'message': reason}]
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_log', 'completed_at'])
