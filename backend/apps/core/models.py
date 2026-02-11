from django.db import models
from django.core.validators import MinValueValidator

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
    def budget_health(self):
        total_allocated = self.category_allocation_total
        if total_allocated > self.total_budget:
            return {
                "status": "OVER_ALLOCATED",
                "excess": total_allocated - self.total_budget,
                "percent": (total_allocated / self.total_budget) * 100
            }
        return {
            "status": "HEALTHY",
            "excess": 0,
            "percent": (total_allocated / self.total_budget) * 100 if self.total_budget > 0 else 0
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


