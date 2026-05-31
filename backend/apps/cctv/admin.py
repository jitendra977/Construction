from django.contrib import admin

from .models import Camera


@admin.register(Camera)
class CameraAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'project', 'is_active', 'updated_at')
    list_filter = ('is_active', 'project')
    search_fields = ('name', 'project__name', 'stream_url')
