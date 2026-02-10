from django.db import models
from apps.core.models import ConstructionPhase, Room
from apps.resources.models import Contractor, Document

class Task(models.Model):
    """
    Specific unit of work to be done.
    """
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('CRITICAL', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('BLOCKED', 'Blocked'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    phase = models.ForeignKey(ConstructionPhase, on_delete=models.CASCADE, related_name='tasks')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    assigned_to = models.ForeignKey(Contractor, on_delete=models.SET_NULL, null=True, blank=True, related_name='tasks')
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='MEDIUM')
    
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class TaskUpdate(models.Model):
    """
    Daily or periodic updates on a task.
    """
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='updates')
    note = models.TextField()
    progress_percentage = models.IntegerField(default=0, help_text="0-100")
    date = models.DateTimeField(auto_now_add=True)
    
    # Photos/Documents related to this update
    attachments = models.ManyToManyField(Document, blank=True, related_name='task_updates')

    def __str__(self):
        return f"Update for {self.task.title} on {self.date.strftime('%Y-%m-%d')}"
