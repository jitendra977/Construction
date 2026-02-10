from django.contrib import admin
from .models import Task, TaskUpdate

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'phase', 'status', 'priority', 'assigned_to', 'due_date')
    list_filter = ('status', 'priority', 'phase', 'assigned_to')
    search_fields = ('title', 'description')
    date_hierarchy = 'start_date'

@admin.register(TaskUpdate)
class TaskUpdateAdmin(admin.ModelAdmin):
    list_display = ('task', 'date', 'progress_percentage')
    list_filter = ('date',)
    search_fields = ('task__title', 'note')
