from django.db import models


class Camera(models.Model):
    project = models.ForeignKey(
        'core.HouseProject',
        on_delete=models.CASCADE,
        related_name='cctv_cameras',
    )
    name = models.CharField(max_length=120)
    stream_url = models.URLField()
    snapshot_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['project_id', 'name']

    def __str__(self):
        return f'{self.name} (P{self.project_id})'
