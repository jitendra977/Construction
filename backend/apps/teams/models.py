from django.db import models
from django.conf import settings

class Team(models.Model):
    """
    Groups of workers (Labour, Staff, Contractors) for project organization.
    e.g., 'Masonry Team', 'Electrical Team A', 'Morning Shift Labours'
    """
    project = models.ForeignKey(
        'core.HouseProject', 
        on_delete=models.CASCADE, 
        related_name='teams'
    )
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Optional leader from the workforce
    leader = models.ForeignKey(
        'attendance.AttendanceWorker', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='led_teams',
        help_text="The person in charge of this team"
    )
    
    # Many-to-many relationship with workers
    members = models.ManyToManyField(
        'attendance.AttendanceWorker', 
        related_name='teams',
        blank=True
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ['project', 'name']

    def __str__(self):
        return f"{self.name} ({self.project.name})"

    @property
    def member_count(self):
        return self.members.count()
