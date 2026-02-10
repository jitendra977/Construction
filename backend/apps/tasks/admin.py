from django.contrib import admin
from .models import Task, TaskMedia, TaskUpdate

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'phase', 'room', 'assigned_to', 'status', 'priority', 'due_date')
    list_filter = ('status', 'priority', 'phase')
    search_fields = ('title', 'description')

@admin.register(TaskMedia)
class TaskMediaAdmin(admin.ModelAdmin):
    list_display = ('task', 'media_type', 'created_at')
    list_filter = ('media_type', 'created_at')

@admin.register(TaskUpdate)
class TaskUpdateAdmin(admin.ModelAdmin):
    list_display = ('task', 'progress_percentage', 'date')
    list_filter = ('date',)
    search_fields = ('note',)
