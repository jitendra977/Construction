from django.db import models

# Re-export Permit Co-Pilot models
from .copilot_models import (  # noqa: F401
    ChecklistItem,
    DeadlineReminder,
    DocumentTemplate,
    MunicipalityStep,
    MunicipalityTemplate,
    PermitChecklist,
)


class PermitStep(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    title = models.CharField(max_length=200) # e.g., Darta, Asthayi
    description = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    date_issued = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    order = models.PositiveIntegerField(default=0)
    
    # Document attachments for this permit step
    documents = models.ManyToManyField(
        'resources.Document',
        blank=True,
        related_name='permit_steps',
        help_text='Documents required/submitted for this permit step'
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.title} - {self.status}"


