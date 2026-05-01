from django.db import models
from django.core.validators import MinValueValidator
from django.conf import settings

class HouseProject(models.Model):
    """
    Singleton model to store overall configuration for the single house project.
    """
    name = models.CharField(max_length=200, default="Mero Ghar Construction")
    owner_name = models.CharField(max_length=100)
    address = models.TextField()
    total_budget = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total allocated budget (Rs.)")
    start_date = models.DateField()
    expected_completion_date = models.DateField()
    area_sqft = models.IntegerField(help_text="Total build area in square feet")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        verbose_name = "House Project Configuration"
        verbose_name_plural = "House Project Configuration"

    @property
    def category_allocation_total(self):
        from apps.finance.models import BudgetCategory
        return sum(cat.allocation for cat in BudgetCategory.objects.filter(project=self))

    @property
    def phase_allocation_total(self):
        from apps.core.models import ConstructionPhase
        return sum(phase.estimated_budget for phase in ConstructionPhase.objects.filter(project=self))

    @property
    def budget_health(self):
        from apps.finance.models import BudgetCategory, PhaseBudgetAllocation, Expense, ZERO
        from decimal import Decimal
        cat_total = self.category_allocation_total
        phase_total = self.phase_allocation_total
        
        status = "HEALTHY"
        issues = []
        
        # 1. Category-level checks (Allocated vs Project Total)
        total_project_budget = self.total_budget
        if cat_total > total_project_budget:
            issues.append({
                "type": "OVER_ALLOCATED_CAT",
                "message": f"Total category allocation (Rs. {cat_total}) exceeds project budget (Rs. {total_project_budget})",
                "data": {"diff": float(cat_total - total_project_budget)}
            })
            status = "OVER_ALLOCATED"

        # 2. Sync Check (Category Total vs Phase Total)
        if abs(cat_total - phase_total) > Decimal("0.01"):
            issues.append({
                "type": "SYNC_MISMATCH",
                "message": f"Category total (Rs. {cat_total}) and Phase total (Rs. {phase_total}) are out of sync",
                "data": {"diff": float(cat_total - phase_total)}
            })
            if status == "HEALTHY": status = "WARNING"

        # 3. Category Spending vs Allocation
        categories = BudgetCategory.objects.filter(project=self).annotate(
            spent=models.Sum('expenses__amount', filter=models.Q(expenses__is_inventory_usage=False))
        )
        for cat in categories:
            spent = cat.spent or ZERO
            dist_total = PhaseBudgetAllocation.objects.filter(category=cat).aggregate(total=models.Sum('amount'))['total'] or ZERO
            if cat.allocation > dist_total + Decimal("0.1"):
                issues.append({
                    "type": "UNASSIGNED_BUDGET",
                    "message": f"Category '{cat.name}' has unassigned budget of Rs. {cat.allocation - dist_total}",
                    "data": {"category_id": cat.id, "category_name": cat.name, "amount": float(cat.allocation - dist_total)}
                })
                if status == "HEALTHY": status = "WARNING"
            
            if spent > cat.allocation:
                issues.append({
                    "type": "OVER_SPENT_CAT",
                    "message": f"Category '{cat.name}' is over-spent by Rs. {spent - cat.allocation}",
                    "data": {"category_id": cat.id, "category_name": cat.name, "spent": float(spent), "planned": float(cat.allocation)}
                })
                status = "OVER_SPENT"

        # 4. Phase Spending vs Estimates
        phases = ConstructionPhase.objects.filter(project=self).annotate(spent=models.Sum('expenses__amount'))
        for ph in phases:
            spent = ph.spent or ZERO
            ph_dist_total = PhaseBudgetAllocation.objects.filter(phase=ph).aggregate(total=models.Sum('amount'))['total'] or ZERO
            
            # Sync check with Accounting
            from apps.accounting.models.budget import PhaseBudgetLine
            pbl = PhaseBudgetLine.objects.filter(phase=ph).first()
            if pbl and abs(pbl.budgeted_amount - ph.estimated_budget) > Decimal("0.01"):
                issues.append({
                    "type": "BUDGET_SYSTEMS_DESYNC",
                    "message": f"Phase '{ph.name}' has out-of-sync budget values: Finance says {ph.estimated_budget}, Accounting says {pbl.budgeted_amount}",
                    "data": {"phase_id": ph.id, "diff": float(abs(pbl.budgeted_amount - ph.estimated_budget))}
                })
                if status == "HEALTHY": status = "WARNING"

            if ph_dist_total > ph.estimated_budget + Decimal("0.1"):
                issues.append({
                    "type": "PHASE_OVERLOAD",
                    "message": f"Phase '{ph.name}' is over-allocated by categories (Rs. {ph_dist_total - ph.estimated_budget} over)",
                    "data": {"phase_id": ph.id, "phase_name": ph.name, "diff": float(ph_dist_total - ph.estimated_budget)}
                })
                if status != "OVER_SPENT": status = "OVER_ALLOCATED"
            
            if spent > ph.estimated_budget:
                issues.append({
                    "type": "OVER_SPENT_PHASE",
                    "message": f"Phase '{ph.name}' is over-spent by Rs. {spent - ph.estimated_budget}",
                    "data": {"phase_id": ph.id, "phase_name": ph.name, "spent": float(spent), "planned": float(ph.estimated_budget)}
                })
                status = "OVER_SPENT"

        # 5. Granular Phase-Category Allocation Checks
        allocations = PhaseBudgetAllocation.objects.filter(category__project=self).select_related('category', 'phase')
        for alloc in allocations:
            alloc_spent = Expense.objects.filter(
                category=alloc.category, 
                phase=alloc.phase
            ).aggregate(total=models.Sum('amount'))['total'] or ZERO
            
            if alloc_spent > alloc.amount:
                issues.append({
                    "type": "OVER_SPENT_ALLOCATION",
                    "message": f"In '{alloc.phase.name}', category '{alloc.category.name}' exceeds its allocation by Rs. {alloc_spent - alloc.amount}",
                    "data": {
                        "phase_id": alloc.phase.id,
                        "category_id": alloc.category.id,
                        "spent": float(alloc_spent),
                        "planned": float(alloc.amount)
                    }
                })
                status = "OVER_SPENT"

        return {
            "status": status,
            "issues": issues,
            "cat_percent": (cat_total / self.total_budget) * 100 if self.total_budget > 0 else 0,
            "phase_percent": (phase_total / self.total_budget) * 100 if self.total_budget > 0 else 0
        }

class ConstructionPhase(models.Model):
    """
    Major phases of Nepali construction.
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('HALTED', 'Halted'),
    ]

    # Pre-defined Nepali phases will be seeded
    project = models.ForeignKey('core.HouseProject', on_delete=models.CASCADE, related_name='phases', null=True, blank=True)
    name = models.CharField(max_length=100, help_text="e.g., Jag Khanne, DPC, Piller Thadaune, Slab Dhalaan")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    order = models.PositiveIntegerField(default=0, help_text="Order of execution")
    description = models.TextField(blank=True)
    technical_spec = models.TextField(blank=True, help_text="Engineer's instructions on how to finish this phase")
    estimated_budget = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Municipal Permit Tracking
    permit_required = models.BooleanField(default=False, help_text="Does this phase require municipal permit approval?")
    permit_status = models.CharField(
        max_length=20,
        choices=[
            ('NOT_REQUIRED', 'Not Required'),
            ('PENDING', 'Pending'),
            ('IN_PROGRESS', 'In Progress'),
            ('APPROVED', 'Approved'),
            ('REJECTED', 'Rejected'),
        ],
        default='NOT_REQUIRED',
        help_text="Status of municipal permit for this phase"
    )
    permit_date_issued = models.DateField(null=True, blank=True, help_text="Date when permit was approved")
    permit_notes = models.TextField(blank=True, help_text="Notes about permit process, requirements, or issues")

    # Documentation and Proof of Work
    naksa_file = models.FileField(upload_to='phases/naksa/', null=True, blank=True, help_text="Blueprints/Naksa for this phase")
    structure_design = models.FileField(upload_to='phases/structure/', null=True, blank=True, help_text="Structural design documents")
    completion_photo = models.ImageField(upload_to='phases/completion/', null=True, blank=True, help_text="Photo proof after phase completion")

    class Meta:
        ordering = ['order']
        unique_together = [('project', 'name')]

    def __str__(self):
        return f"{self.order}. {self.name}"

class Floor(models.Model):
    """
    Represents a floor level in the house.
    """
    name = models.CharField(max_length=100, help_text="e.g., Ground Floor, First Floor")
    level = models.IntegerField(default=0, help_text="Level for sorting (0=Ground, 1=First, etc.)")
    image = models.ImageField(upload_to='floor_plans/', null=True, blank=True)
    # 2D plan dimensions (exterior, in cm)
    plan_width_cm  = models.IntegerField(null=True, blank=True, help_text="Building exterior width in cm")
    plan_depth_cm  = models.IntegerField(null=True, blank=True, help_text="Building exterior depth in cm")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    project = models.ForeignKey(
        'core.HouseProject', on_delete=models.CASCADE, related_name='floors',
        null=True, blank=True
    )

    class Meta:
        ordering = ['level']

    def __str__(self):
        return self.name

class Room(models.Model):
    """
    Specific rooms or areas in the house.
    """
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Suru Bhayena'),
        ('IN_PROGRESS', 'Kaam Hudai Cha'),
        ('COMPLETED', 'Sakiya'),
    ]

    ROOM_TYPE_CHOICES = [
        ('BEDROOM',   'Bedroom / सुत्ने कोठा'),
        ('KITCHEN',   'Kitchen / भान्सा'),
        ('BATHROOM',  'Bathroom / शौचालय'),
        ('LIVING',    'Living Room / बैठककोठा'),
        ('DINING',    'Dining Room / खाने कोठा'),
        ('OFFICE',    'Office / कार्यालय'),
        ('STORE',     'Store / भण्डार'),
        ('STAIRCASE', 'Staircase / सिँढी'),
        ('TERRACE',   'Terrace / छत'),
        ('BALCONY',   'Balcony / बरन्डा'),
        ('PUJA',      'Puja Room / पूजाकोठा'),
        ('GARAGE',    'Garage / गाडी राख्ने'),
        ('LAUNDRY',   'Laundry / धुलाईकोठा'),
        ('HALL',      'Hall / हल'),
        ('OTHER',     'Other / अन्य'),
    ]

    FLOOR_FINISH_CHOICES = [
        ('TILE',    'Tile / टाइल'),
        ('MARBLE',  'Marble / मार्बल'),
        ('GRANITE', 'Granite / ग्रेनाइट'),
        ('WOOD',    'Wood / काठ'),
        ('CEMENT',  'Cement / सिमेन्ट'),
        ('STONE',   'Stone / ढुङ्गा'),
        ('OTHER',   'Other / अन्य'),
    ]

    WALL_FINISH_CHOICES = [
        ('PAINT',   'Paint / रङ'),
        ('PLASTER', 'Plaster / लिपाइ'),
        ('TILE',    'Tile / टाइल'),
        ('STONE',   'Stone / ढुङ्गा'),
        ('OTHER',   'Other / अन्य'),
    ]

    name              = models.CharField(max_length=100, help_text="e.g., Puja Kotha, Bhansa, Baithak")
    floor             = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    room_type         = models.CharField(max_length=20, choices=ROOM_TYPE_CHOICES, default='OTHER', blank=True)
    area_sqft         = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    status            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    budget_allocation = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    PRIORITY_CHOICES = [
        ('HIGH',   'High / उच्च'),
        ('MEDIUM', 'Medium / मध्यम'),
        ('LOW',    'Low / कम'),
    ]

    # Physical properties
    ceiling_height_cm = models.IntegerField(null=True, blank=True, default=315,
                                            help_text="Ceiling height in cm (315 cm = ~10.3 ft)")
    floor_finish      = models.CharField(max_length=20, choices=FLOOR_FINISH_CHOICES, blank=True, default='')
    wall_finish       = models.CharField(max_length=20, choices=WALL_FINISH_CHOICES,  blank=True, default='')
    color_scheme      = models.CharField(max_length=100, blank=True, default='',
                                         help_text="Wall paint color name or code e.g. 'Off-White #F5F5F5'")
    window_count      = models.PositiveSmallIntegerField(default=0, help_text="Number of windows")
    door_count        = models.PositiveSmallIntegerField(default=1, help_text="Number of doors")

    # Electrical & MEP points
    electrical_points = models.PositiveSmallIntegerField(default=0,
                                                         help_text="Switch/socket outlet points")
    light_points      = models.PositiveSmallIntegerField(default=0,
                                                         help_text="Light fixture / batten points")
    fan_points        = models.PositiveSmallIntegerField(default=0,
                                                         help_text="Ceiling fan provision points")
    ac_provision      = models.BooleanField(default=False,
                                            help_text="AC outdoor unit provision (conduit + bracket)")
    plumbing_points   = models.PositiveSmallIntegerField(default=0,
                                                         help_text="Water supply + drain connection points")

    # Scheduling
    priority          = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM', blank=True)
    completion_date   = models.DateField(null=True, blank=True,
                                         help_text="Actual or target completion date")

    notes             = models.TextField(blank=True, default='', help_text="Additional remarks / टिप्पणी")

    # 2D plan layout (all in cm, from building outer top-left corner)
    width_cm       = models.IntegerField(null=True, blank=True, help_text="Room interior width in cm")
    depth_cm       = models.IntegerField(null=True, blank=True, help_text="Room interior depth in cm")
    pos_x          = models.IntegerField(null=True, blank=True, help_text="X position from building left (cm)")
    pos_y          = models.IntegerField(null=True, blank=True, help_text="Y position from building top (cm)")
    polygon_points = models.JSONField(null=True, blank=True,
                                      help_text="Custom polygon as [{x,y},...] in cm. Null = rectangular.")

    def __str__(self):
        return f"{self.name} ({self.floor.name})"

class UserGuide(models.Model):
    """
    Main guide entry for a specific page or module.
    """
    TYPE_CHOICES = [
        ('modal', 'Modal Dialog'),
        ('tour', 'Interactive Tour'),
        ('sidebar', 'Sidebar Content'),
    ]

    key = models.CharField(max_length=50, unique=True, help_text="Unique key for the guide (e.g., 'home', 'stock')")
    is_active = models.BooleanField(default=True, help_text="Whether this guide is active and should be shown.")
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='modal', help_text="How the guide should be displayed in the frontend.")
    icon = models.CharField(max_length=10, default="ℹ️")
    title_en = models.CharField(max_length=200)
    title_ne = models.CharField(max_length=200)
    description_en = models.TextField()
    description_ne = models.TextField()
    
    video_url = models.URLField(blank=True, help_text="Optional link to a video tutorial.")
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.key} - {self.title_en}"

    class Meta:
        verbose_name = "User Guide"
        verbose_name_plural = "User Guides"
        ordering = ['order']

class UserGuideStep(models.Model):
    """
    Individual steps for a guide — any authenticated user can add.
    """
    PLACEMENT_CHOICES = [
        ('top', 'Top'),
        ('bottom', 'Bottom'),
        ('left', 'Left'),
        ('right', 'Right'),
        ('center', 'Center'),
    ]

    guide = models.ForeignKey(UserGuide, on_delete=models.CASCADE, related_name='steps')
    order = models.PositiveIntegerField(default=0)
    text_en = models.TextField()
    text_ne = models.TextField(blank=True)

    # Interactive Tour Specifics
    target_element = models.CharField(max_length=255, blank=True)
    media = models.FileField(upload_to='guides/steps/', null=True, blank=True)
    placement = models.CharField(max_length=20, choices=PLACEMENT_CHOICES, blank=True)

    # Contributor tracking
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='guide_steps_added'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.guide.key} Step {self.order}"


class UserGuideFAQ(models.Model):
    """
    Frequently asked questions — any authenticated user can add.
    """
    guide = models.ForeignKey(UserGuide, on_delete=models.CASCADE, related_name='faqs')
    question_en = models.TextField()
    question_ne = models.TextField(blank=True)
    answer_en = models.TextField()
    answer_ne = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    # Contributor tracking
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='guide_faqs_added'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.guide.key} FAQ: {self.question_en[:30]}"


class UserGuideSection(models.Model):
    """
    Flexible custom section (Tips, Warnings, Notes, or any custom label)
    that any authenticated user can contribute to a module guide.
    """
    SECTION_TYPES = [
        ('tip',     '💡 Tip'),
        ('warning', '⚠️ Warning'),
        ('note',    '📝 Note'),
        ('trick',   '🎯 Pro Trick'),
        ('custom',  '📌 Custom'),
    ]

    guide        = models.ForeignKey(UserGuide, on_delete=models.CASCADE, related_name='sections')
    section_type = models.CharField(max_length=20, choices=SECTION_TYPES, default='note')
    title_en     = models.CharField(max_length=200)
    title_ne     = models.CharField(max_length=200, blank=True)
    content_en   = models.TextField()
    content_ne   = models.TextField(blank=True)
    order        = models.PositiveIntegerField(default=0)

    # Contributor tracking
    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='guide_sections_added'
    )
    is_approved  = models.BooleanField(default=True, help_text="Admins can hide contributed sections.")
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = "Guide Section"
        verbose_name_plural = "Guide Sections"

    def __str__(self):
        return f"{self.guide.key} — {self.get_section_type_display()}: {self.title_en[:40]}"


class UserGuideProgress(models.Model):
    """
    Tracks which user has completed which guide, so it doesn't repeatedly show.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guide_progress')
    guide = models.ForeignKey(UserGuide, on_delete=models.CASCADE, related_name='progress')
    is_completed = models.BooleanField(default=False)
    last_step_seen = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'guide')

    def __str__(self):
        return f"{self.user.username} - {self.guide.key} ({'Completed' if self.is_completed else 'In Progress'})"


class EmailLog(models.Model):
    """
    Audit log for every outgoing email sent by the system.
    """
    EMAIL_TYPE_CHOICES = [
        ('PAYMENT_RECEIPT', 'Payment Receipt'),
        ('PURCHASE_ORDER', 'Purchase Order'),
        ('CONTRACTOR_NOTIFICATION', 'Contractor Notification'),
        ('OTHER', 'Other'),
    ]
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    ]

    email_type = models.CharField(max_length=30, choices=EMAIL_TYPE_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='SENT')
    recipient_name = models.CharField(max_length=200)
    recipient_email = models.EmailField()
    subject = models.CharField(max_length=500)
    
    # Optional links to related objects
    payment = models.ForeignKey('finance.Payment', on_delete=models.SET_NULL, null=True, blank=True, related_name='email_logs')
    expense = models.ForeignKey('finance.Expense', on_delete=models.SET_NULL, null=True, blank=True, related_name='email_logs')
    material = models.ForeignKey('resources.Material', on_delete=models.SET_NULL, null=True, blank=True, related_name='email_logs')
    
    sent_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_emails')
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Email Log"
        verbose_name_plural = "Email Logs"

    def __str__(self):
        return f"[{self.email_type}] {self.subject} → {self.recipient_email} ({self.status})"


class ProjectMember(models.Model):
    """
    Team member with a project-specific role and granular permission flags.

    Each member has a `role` (broad classification) and seven boolean
    permission flags that can be individually overridden.  When a member is
    first created, `apply_role_defaults()` is called to seed those flags from
    the role's standard permission matrix.
    """
    ROLE_CHOICES = [
        ('OWNER',       'Owner / मालिक'),
        ('MANAGER',     'Project Manager / परियोजना प्रबन्धक'),
        ('ENGINEER',    'Engineer / इन्जिनियर'),
        ('SUPERVISOR',  'Supervisor / सुपरभाइजर'),
        ('CONTRACTOR',  'Contractor / ठेकेदार'),
        ('VIEWER',      'Viewer / दर्शक'),
    ]

    # Default permission matrix — keyed by role
    ROLE_DEFAULT_PERMISSIONS = {
        'OWNER': {
            'can_manage_members':    True,
            'can_manage_finances':   True,
            'can_view_finances':     True,
            'can_manage_phases':     True,
            'can_manage_structure':  True,
            'can_manage_resources':  True,
            'can_upload_media':      True,
            'can_manage_workforce':  True,
            'can_approve_purchases': True,
        },
        'MANAGER': {
            'can_manage_members':    True,
            'can_manage_finances':   True,
            'can_view_finances':     True,
            'can_manage_phases':     True,
            'can_manage_structure':  True,
            'can_manage_resources':  True,
            'can_upload_media':      True,
            'can_manage_workforce':  True,
            'can_approve_purchases': True,
        },
        'ENGINEER': {
            'can_manage_members':    False,
            'can_manage_finances':   False,
            'can_view_finances':     True,
            'can_manage_phases':     True,
            'can_manage_structure':  True,
            'can_manage_resources':  True,   # can raise purchase requests
            'can_upload_media':      True,
            'can_manage_workforce':  False,
            'can_approve_purchases': False,  # requests only — manager approves
        },
        'SUPERVISOR': {
            'can_manage_members':    False,
            'can_manage_finances':   False,
            'can_view_finances':     True,
            'can_manage_phases':     True,
            'can_manage_structure':  False,
            'can_manage_resources':  False,
            'can_upload_media':      True,
            'can_manage_workforce':  True,   # attendance, teams, payroll view
            'can_approve_purchases': False,
        },
        'CONTRACTOR': {
            'can_manage_members':    False,
            'can_manage_finances':   False,
            'can_view_finances':     False,
            'can_manage_phases':     False,
            'can_manage_structure':  False,
            'can_manage_resources':  True,
            'can_upload_media':      True,
            'can_manage_workforce':  False,
            'can_approve_purchases': False,
        },
        'VIEWER': {
            'can_manage_members':    False,
            'can_manage_finances':   False,
            'can_view_finances':     True,
            'can_manage_phases':     False,
            'can_manage_structure':  False,
            'can_manage_resources':  False,
            'can_upload_media':      False,
            'can_manage_workforce':  False,
            'can_approve_purchases': False,
        },
    }

    project = models.ForeignKey(
        'core.HouseProject', on_delete=models.CASCADE,
        related_name='members',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='project_memberships',
    )
    role     = models.CharField(max_length=20, choices=ROLE_CHOICES, default='VIEWER')
    note     = models.CharField(max_length=200, blank=True, default='',
                                help_text="Short note e.g. 'Lead civil engineer'")
    joined_at = models.DateTimeField(auto_now_add=True)

    # ── Granular permission flags ─────────────────────────────────────────────
    can_manage_members   = models.BooleanField(default=False,
        help_text='Add / remove / edit team members')
    can_manage_finances  = models.BooleanField(default=False,
        help_text='Create / edit expenses, budgets, payments')
    can_view_finances    = models.BooleanField(default=False,
        help_text='Read-only access to financial data')
    can_manage_phases    = models.BooleanField(default=False,
        help_text='Create / edit phases and tasks')
    can_manage_structure = models.BooleanField(default=False,
        help_text='Create / edit floors and rooms')
    can_manage_resources = models.BooleanField(default=False,
        help_text='Create / edit materials, contractors, suppliers')
    can_upload_media     = models.BooleanField(default=False,
        help_text='Upload photos and documents')
    can_manage_workforce = models.BooleanField(default=False,
        help_text='Mark attendance, manage teams, view payroll for assigned workers')
    can_approve_purchases = models.BooleanField(default=False,
        help_text='Approve purchase requests raised by engineers / contractors')

    class Meta:
        unique_together = ('project', 'user')
        ordering = ['role', 'joined_at']
        verbose_name = 'Project Member'
        verbose_name_plural = 'Project Members'

    def __str__(self):
        return f"{self.user.username} → {self.project.name} ({self.role})"

    # ── Helpers ───────────────────────────────────────────────────────────────
    def apply_role_defaults(self):
        """Seed all permission flags from this member's role defaults."""
        defaults = self.ROLE_DEFAULT_PERMISSIONS.get(self.role, {})
        for field, value in defaults.items():
            setattr(self, field, value)

    @property
    def permission_fields(self):
        return [
            'can_manage_members',   'can_manage_finances',  'can_view_finances',
            'can_manage_phases',    'can_manage_structure',
            'can_manage_resources', 'can_upload_media',
            'can_manage_workforce', 'can_approve_purchases',
        ]
