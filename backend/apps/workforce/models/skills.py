import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class Skill(models.Model):
    """Master list of skills. Admin-managed."""

    class TradeType(models.TextChoices):
        CIVIL      = 'civil',      _('Civil')
        STRUCTURAL = 'structural', _('Structural')
        ELECTRICAL = 'electrical', _('Electrical')
        PLUMBING   = 'plumbing',   _('Plumbing')
        HVAC       = 'hvac',       _('HVAC')
        FINISHING  = 'finishing',  _('Finishing')
        SAFETY     = 'safety',     _('Safety')
        MANAGEMENT = 'management', _('Management')
        OTHER      = 'other',      _('Other')

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name        = models.CharField(max_length=100, unique=True)
    trade_type  = models.CharField(max_length=20, choices=TradeType.choices)
    description = models.TextField(blank=True)
    is_active   = models.BooleanField(default=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name        = _('Skill')
        verbose_name_plural = _('Skills')
        ordering            = ['trade_type', 'name']

    def __str__(self):
        return f'{self.name} [{self.get_trade_type_display()}]'


class WorkerSkill(models.Model):
    """
    A skill assigned to a specific WorkforceMember,
    with proficiency level, certification, and verification status.
    """

    class Level(models.TextChoices):
        BEGINNER     = 'beginner',     _('Beginner')
        INTERMEDIATE = 'intermediate', _('Intermediate')
        ADVANCED     = 'advanced',     _('Advanced')
        EXPERT       = 'expert',       _('Expert')

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.CASCADE,
        related_name='skills',
    )
    skill  = models.ForeignKey(
        Skill,
        on_delete=models.PROTECT,
        related_name='worker_skills',
    )

    # ── Proficiency ───────────────────────────────────────────
    level            = models.CharField(max_length=15, choices=Level.choices)
    years_experience = models.PositiveSmallIntegerField(default=0)

    # ── Certification ─────────────────────────────────────────
    is_certified       = models.BooleanField(default=False)
    certified_by       = models.CharField(max_length=200, blank=True)
    certified_date     = models.DateField(null=True, blank=True)
    expiry_date        = models.DateField(null=True, blank=True)
    certificate_number = models.CharField(max_length=100, blank=True)

    # ── Verification ──────────────────────────────────────────
    is_verified   = models.BooleanField(default=False)
    verified_by   = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='skill_verifications',
    )
    verified_date = models.DateField(null=True, blank=True)

    notes      = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Worker Skill')
        verbose_name_plural = _('Worker Skills')
        unique_together     = [('worker', 'skill')]
        ordering            = ['-level', 'skill']

    def __str__(self):
        return (
            f'{self.worker.full_name} — '
            f'{self.skill.name} ({self.get_level_display()})'
        )

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
