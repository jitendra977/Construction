import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class WorkforceCategory(models.Model):
    """
    Hierarchical category tree.

    Example tree:
        Labour
        ├── Skilled Labour
        │   ├── Mason (Dakarmi)
        │   ├── Carpenter (Mistri)
        │   └── Steel Fixer (Lohari)
        └── Unskilled Labour
            └── Helper (Jugi)
        Staff
        ├── Site Management
        │   ├── Site Supervisor
        │   └── Project Manager
        └── Safety & QA
    """

    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name   = models.CharField(max_length=100, unique=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='children',
    )
    description = models.TextField(blank=True)
    icon        = models.CharField(max_length=50, blank=True)
    color       = models.CharField(max_length=7, blank=True, help_text=_('Hex e.g. #FF5733'))
    is_active   = models.BooleanField(default=True)
    order       = models.PositiveSmallIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Workforce Category')
        verbose_name_plural = _('Workforce Categories')
        ordering            = ['order', 'name']

    def __str__(self):
        return f'{self.parent.name} → {self.name}' if self.parent else self.name

    def get_ancestors(self):
        ancestors, node = [], self.parent
        while node:
            ancestors.insert(0, node)
            node = node.parent
        return ancestors


class WorkforceRole(models.Model):
    """
    Specific job role within a category.

    The trade_code maps to AttendanceWorker.TRADE_CHOICES so you can
    automatically create/filter AttendanceWorker records by role:

        AttendanceWorker.objects.filter(trade=role.trade_code)
    """

    # Mirror AttendanceWorker.TRADE_CHOICES for cross-app queries.
    TRADE_CODE_CHOICES = [
        ('MASON',       'Mason (Dakarmi)'),
        ('HELPER',      'Helper (Jugi)'),
        ('CARPENTER',   'Carpenter (Mistri)'),
        ('ELECTRICIAN', 'Electrician'),
        ('PLUMBER',     'Plumber'),
        ('PAINTER',     'Painter'),
        ('STEEL_FIXER', 'Steel Fixer (Lohari)'),
        ('SUPERVISOR',  'Site Supervisor'),
        ('TILE_SETTER', 'Tile Setter'),
        ('EXCAVATOR',   'Excavator Operator'),
        ('WATERPROOF',  'Waterproofing Applicator'),
        ('DRIVER',      'Driver'),
        ('SECURITY',    'Security Guard'),
        ('ENGINEER',    'Engineer'),
        ('ACCOUNTANT',  'Accountant'),
        ('MANAGER',     'Project Manager'),
        ('OTHER',       'Other'),
    ]

    class WageType(models.TextChoices):
        HOURLY  = 'hourly',  _('Hourly')
        DAILY   = 'daily',   _('Daily')
        MONTHLY = 'monthly', _('Monthly')

    id       = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        WorkforceCategory,
        on_delete=models.PROTECT,
        related_name='roles',
    )
    title      = models.CharField(max_length=100)
    code       = models.CharField(
        max_length=20, unique=True,
        help_text=_('Short code e.g. ELEC, MASON, PM'),
    )

    # Ties this role to an AttendanceWorker trade choice.
    # Allows: WorkforceRole.objects.get(trade_code='MASON')
    trade_code = models.CharField(
        max_length=20,
        choices=TRADE_CODE_CHOICES,
        blank=True,
        help_text=_(
            'Maps to attendance.AttendanceWorker.trade. '
            'Used to link roles across apps.'
        ),
    )

    description      = models.TextField(blank=True)
    requires_license = models.BooleanField(default=False)
    requires_cert    = models.BooleanField(default=False)

    # Default wage (overridden per worker in WageStructure)
    default_wage_type   = models.CharField(
        max_length=10, choices=WageType.choices, default=WageType.DAILY,
    )
    default_wage_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    currency = models.CharField(max_length=3, default='NPR')

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('Workforce Role')
        verbose_name_plural = _('Workforce Roles')
        ordering            = ['category', 'title']
        unique_together     = [('category', 'title')]

    def __str__(self):
        return f'{self.title} ({self.code})'

    def get_active_members(self):
        return self.members.filter(status='ACTIVE')

    def get_attendance_workers(self, project=None):
        """
        Return AttendanceWorker records matching this role's trade_code.
        Optionally filter by project.
        """
        from apps.attendance.models import AttendanceWorker
        qs = AttendanceWorker.objects.filter(trade=self.trade_code)
        if project:
            qs = qs.filter(project=project)
        return qs
