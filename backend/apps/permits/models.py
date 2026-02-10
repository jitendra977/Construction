from django.db import models

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

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.title} - {self.status}"

class LegalDocument(models.Model):
    DOC_TYPE_CHOICES = [
        ('LALPURJA', 'Lalpurja (Land Certificate)'),
        ('NAGRIKTA', 'Nagrikta (Citizenship)'),
        ('NAKSHA', 'Naksha (Blueprint)'),
        ('TIRO', 'Tiro Rasid (Tax Receipt)'),
        ('CHARKILLA', 'Charkilla (Boundary)'),
        ('OTHER', 'Other'),
    ]

    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES, default='OTHER')
    file = models.FileField(upload_to='legal_docs/')
    upload_date = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-upload_date']

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"
