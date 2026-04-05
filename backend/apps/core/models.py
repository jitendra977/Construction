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
        return sum(cat.allocation for cat in BudgetCategory.objects.all())

    @property
    def phase_allocation_total(self):
        from apps.core.models import ConstructionPhase
        return sum(phase.estimated_budget for phase in ConstructionPhase.objects.all())

    @property
    def budget_health(self):
        from apps.finance.models import BudgetCategory, PhaseBudgetAllocation
        cat_total = self.category_allocation_total
        phase_total = self.phase_allocation_total
        
        status = "HEALTHY"
        issues = []
        
        # 1. Category vs Master Budget
        if cat_total > self.total_budget:
            status = "OVER_ALLOCATED"
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
        if abs(cat_total - phase_total) > 0.01:
            issues.append({
                "type": "SYNC_MISMATCH",
                "message": f"Category total (Rs. {cat_total}) and Phase total (Rs. {phase_total}) are out of sync",
                "data": {"diff": float(cat_total - phase_total)}
            })
            if status == "HEALTHY": status = "WARNING"

        # 3. Category Spending vs Allocation (Plan vs Actual - Cashflow Basis)
        categories = BudgetCategory.objects.annotate(
            spent=models.Sum('expenses__amount', filter=models.Q(expenses__is_inventory_usage=False))
        )
        for cat in categories:
            spent = cat.spent or 0
            # Check if over-allocated to phases
            dist_total = PhaseBudgetAllocation.objects.filter(category=cat).aggregate(total=models.Sum('amount'))['total'] or 0
            if cat.allocation > dist_total + models.DecimalField(default=0).to_python(0.1): # Tiny buffer for floating point
                issues.append({
                    "type": "UNASSIGNED_BUDGET",
                    "message": f"Category '{cat.name}' has unassigned budget of Rs. {cat.allocation - dist_total}",
                    "data": {"category_id": cat.id, "category_name": cat.name, "amount": float(cat.allocation - dist_total)}
                })
                if status == "HEALTHY": status = "WARNING"
            
            # Check if over-spent (Primary Budget Burn)
            if spent > cat.allocation:
                issues.append({
                    "type": "OVER_SPENT_CAT",
                    "message": f"Category '{cat.name}' is over-spent by Rs. {spent - cat.allocation}",
                    "data": {"category_id": cat.id, "category_name": cat.name, "spent": float(spent), "planned": float(cat.allocation)}
                })
                status = "OVER_SPENT"

        # 4. Phase Spending vs Estimates (Plan vs Actual - Consumption Basis)
        phases = ConstructionPhase.objects.annotate(spent=models.Sum('expenses__amount'))
        for ph in phases:
            spent = ph.spent or 0
            ph_dist_total = PhaseBudgetAllocation.objects.filter(phase=ph).aggregate(total=models.Sum('amount'))['total'] or 0
            
            # Check if over-allocated by categories
            if ph_dist_total > ph.estimated_budget + models.DecimalField(default=0).to_python(0.1):
                issues.append({
                    "type": "PHASE_OVERLOAD",
                    "message": f"Phase '{ph.name}' is over-allocated by categories (Rs. {ph_dist_total - ph.estimated_budget} over)",
                    "data": {"phase_id": ph.id, "phase_name": ph.name, "diff": float(ph_dist_total - ph.estimated_budget)}
                })
                if status != "OVER_SPENT": status = "OVER_ALLOCATED"
            
            # Check if over-spent
            if spent > ph.estimated_budget:
                issues.append({
                    "type": "OVER_SPENT_PHASE",
                    "message": f"Phase '{ph.name}' is over-spent by Rs. {spent - ph.estimated_budget}",
                    "data": {"phase_id": ph.id, "phase_name": ph.name, "spent": float(spent), "planned": float(ph.estimated_budget)}
                })
                status = "OVER_SPENT"

        # 5. Granular Phase-Category Allocation Checks
        allocations = PhaseBudgetAllocation.objects.select_related('category', 'phase').all()
        from apps.finance.models import Expense
        for alloc in allocations:
            alloc_spent = Expense.objects.filter(
                category=alloc.category, 
                phase=alloc.phase
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            
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
    name = models.CharField(max_length=100, unique=True, help_text="e.g., Jag Khanne, DPC, Piller Thadaune, Slab Dhalaan")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    order = models.PositiveIntegerField(default=0, help_text="Order of execution")
    description = models.TextField(blank=True)
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

    def __str__(self):
        return f"{self.order}. {self.name}"

class Floor(models.Model):
    """
    Represents a floor level in the house.
    """
    name = models.CharField(max_length=100, help_text="e.g., Ground Floor, First Floor")
    level = models.IntegerField(default=0, help_text="Level for sorting (0=Ground, 1=First, etc.)")
    image = models.ImageField(upload_to='floor_plans/', null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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

    name = models.CharField(max_length=100, help_text="e.g., Puja Kotha, Bhansa, Baithak")
    floor = models.ForeignKey(Floor, on_delete=models.CASCADE, related_name='rooms')
    area_sqft = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    
    budget_allocation = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

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
    Individual steps for a guide.
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
    text_ne = models.TextField()
    
    # Interactive Tour Specifics
    target_element = models.CharField(max_length=255, blank=True, help_text="CSS selector for the element to highlight (e.g., '#add-btn').")
    media = models.FileField(upload_to='guides/steps/', null=True, blank=True, help_text="Image or GIF to show in the step.")
    placement = models.CharField(max_length=20, choices=PLACEMENT_CHOICES, blank=True, help_text="Tooltip placement for tour libraries.")

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.guide.key} Step {self.order}"

class UserGuideFAQ(models.Model):
    """
    Frequently asked questions for a guide.
    """
    guide = models.ForeignKey(UserGuide, on_delete=models.CASCADE, related_name='faqs')
    question_en = models.TextField()
    question_ne = models.TextField()
    answer_en = models.TextField()
    answer_ne = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.guide.key} FAQ: {self.question_en[:30]}"

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


