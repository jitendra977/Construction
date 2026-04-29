import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class WorkerEvaluation(models.Model):
    """
    Formal end-of-project evaluation with scored dimensions
    and a rehire recommendation.

    Attendance context is pulled automatically via the worker's
    AttendanceWorker link — no data duplication needed here.
    """

    class Recommendation(models.TextChoices):
        REHIRE     = 'rehire',     _('Rehire')
        CONDITIONAL = 'conditional', _('Conditional Rehire')
        DO_NOT     = 'do_not',     _('Do Not Rehire')
        PROMOTE    = 'promote',    _('Recommend for Promotion')

    SCORE_CHOICES = [(i, str(i)) for i in range(1, 6)]  # 1–5

    id        = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker    = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    evaluator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='evaluations_given',
    )
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='worker_evaluations',
    )

    eval_date = models.DateField()

    # ── Scored dimensions (1–5) ───────────────────────────────
    score_punctuality  = models.PositiveSmallIntegerField(choices=SCORE_CHOICES)
    score_quality      = models.PositiveSmallIntegerField(choices=SCORE_CHOICES)
    score_safety       = models.PositiveSmallIntegerField(choices=SCORE_CHOICES)
    score_teamwork     = models.PositiveSmallIntegerField(choices=SCORE_CHOICES)
    score_productivity = models.PositiveSmallIntegerField(choices=SCORE_CHOICES)

    # ── Attendance summary (read from attendance app at eval time) ────
    # Snapshot so evaluation is self-contained even if attendance records change.
    attendance_days_present  = models.DecimalField(
        max_digits=6, decimal_places=1, default=0,
    )
    attendance_days_absent   = models.PositiveSmallIntegerField(default=0)
    attendance_late_count    = models.PositiveSmallIntegerField(
        default=0,
        help_text=_('Number of QRScanLog records where is_late=True.'),
    )
    attendance_early_out_count = models.PositiveSmallIntegerField(
        default=0,
        help_text=_('Number of QRScanLog records where is_early=True.'),
    )

    # ── Outcome ───────────────────────────────────────────────
    recommendation = models.CharField(
        max_length=15, choices=Recommendation.choices,
    )
    comments    = models.TextField(blank=True)
    is_shared   = models.BooleanField(
        default=False,
        help_text=_('Whether this evaluation has been shared with the worker.'),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Worker Evaluation')
        verbose_name_plural = _('Worker Evaluations')
        ordering            = ['-eval_date']
        unique_together     = [('worker', 'project', 'eval_date')]
        indexes = [
            models.Index(fields=['worker', 'recommendation']),
            models.Index(fields=['eval_date']),
        ]

    def __str__(self):
        return (
            f'{self.worker.full_name} — {self.eval_date} — '
            f'{self.get_recommendation_display()}'
        )

    @property
    def overall_score(self):
        scores = [
            self.score_punctuality,
            self.score_quality,
            self.score_safety,
            self.score_teamwork,
            self.score_productivity,
        ]
        return round(sum(scores) / len(scores), 2)

    def snapshot_attendance(self):
        """
        Populate attendance summary fields from QRScanLog and DailyAttendance.
        Call before saving a new evaluation:
            evaluation.snapshot_attendance()
            evaluation.save()
        """
        from django.db.models import Sum
        from attendance.models import DailyAttendance, QRScanLog
        from decimal import Decimal

        aw = self.worker.attendance_worker
        if not aw:
            return

        da_qs = DailyAttendance.objects.filter(worker=aw)
        if self.project:
            da_qs = da_qs.filter(project=self.project)

        present = Decimal('0')
        absent  = 0
        for rec in da_qs.only('status'):
            if rec.status == 'PRESENT':
                present += Decimal('1')
            elif rec.status == 'HALF_DAY':
                present += Decimal('0.5')
            elif rec.status == 'ABSENT':
                absent += 1

        self.attendance_days_present = present
        self.attendance_days_absent  = absent

        scan_qs = QRScanLog.objects.filter(
            worker=aw, scan_status='VALID',
        )
        self.attendance_late_count     = scan_qs.filter(is_late=True).count()
        self.attendance_early_out_count = scan_qs.filter(is_early=True).count()
