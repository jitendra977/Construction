from django.db import models
from django.conf import settings

class BackupLog(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    )

    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size_mb = models.FloatField(blank=True, null=True)
    google_drive_file_id = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def mark_failed(self, error: str):
        from django.utils import timezone
        self.status = 'failed'
        self.error_message = error
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'error_message', 'completed_at'])

    def mark_success(self, file_name: str, size_mb: float, gdrive_id: str):
        from django.utils import timezone
        self.status = 'success'
        self.file_name = file_name
        self.file_size_mb = size_mb
        self.google_drive_file_id = gdrive_id
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'file_name', 'file_size_mb', 'google_drive_file_id', 'completed_at'])

    def __str__(self):
        return f"Backup {self.id} - {self.status}"
