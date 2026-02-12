from django.db import models

class ConstructionRate(models.Model):
    CATEGORY_CHOICES = [
        ('MATERIAL', 'Material'),
        ('LABOR', 'Labor'),
        ('OTHER', 'Other'),
    ]

    key = models.CharField(max_length=50, unique=True, help_text="The unique key used in calculation services (e.g., CEMENT, SAND)")
    label = models.CharField(max_length=100, help_text="Display name for the rate")
    value = models.DecimalField(max_digits=12, decimal_places=2, help_text="Price per unit in NPR")
    unit = models.CharField(max_length=20, help_text="Unit of measurement (e.g., Bag, Cft, Kg, Sq.Ft)")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='MATERIAL')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.label}: {self.value} per {self.unit}"

    class Meta:
        ordering = ['category', 'label']
