from django.db import models


class PermitDocument(models.Model):
    """
    Documents owned by the permits app (blueprints, land certs, permit letters, etc.).
    Replaces the old resources.Document dependency.
    """
    TYPE_CHOICES = [
        ('NAKSHA',    'Naksha (Blueprint/Map)'),
        ('LALPURJA',  'Lalpurja (Land Cert)'),
        ('NAGRIKTA',  'Nagrikta (Citizenship)'),
        ('TIRO',      'Tiro Rasid (Tax Receipt)'),
        ('CHARKILLA', 'Charkilla (Boundary)'),
        ('PERMIT',    'Nagar Palika Permit'),
        ('BILL',      'Bill/Invoice'),
        ('PHOTO',     'Site Photo'),
        ('AGREEMENT', 'Samjhauta Patra (Contract)'),
        ('OTHER',     'Other'),
    ]

    title         = models.CharField(max_length=200)
    file          = models.FileField(upload_to='permit-documents/%Y/%m/')
    document_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='OTHER')
    description   = models.TextField(blank=True)
    uploaded_at   = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"


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
    project = models.ForeignKey(
        'core.HouseProject', on_delete=models.CASCADE, related_name='permit_steps',
        null=True, blank=True
    )
    
    # Document attachments for this permit step
    documents = models.ManyToManyField(
        'permits.PermitDocument',
        blank=True,
        related_name='permit_steps',
        help_text='Documents required/submitted for this permit step'
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.title} - {self.status}"


