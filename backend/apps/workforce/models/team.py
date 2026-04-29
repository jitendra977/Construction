from django.db import models


class Team(models.Model):
    """
    Named group of WorkforceMembers for a project.
    e.g. 'Civil Team', 'MEP Team', 'Morning Shift'.

    Previously lived in apps.teams — moved here so that leader / members
    reference WorkforceMember (the canonical worker record) instead of
    the legacy attendance.AttendanceWorker.
    """
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.CASCADE,
        related_name='teams',
    )
    name        = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    leader = models.ForeignKey(
        'workforce.WorkforceMember',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_teams',
        help_text='WorkforceMember who leads this team.',
    )
    members = models.ManyToManyField(
        'workforce.WorkforceMember',
        related_name='teams',
        blank=True,
    )

    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering        = ['name']
        unique_together = ['project', 'name']

    def __str__(self):
        return f'{self.name} ({self.project.name})'

    @property
    def member_count(self):
        return self.members.count()
