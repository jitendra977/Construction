from django.contrib import admin
from .models import (
    PermitStep, PermitChecklist, ChecklistItem, 
    DeadlineReminder, DocumentTemplate, MunicipalityStep, MunicipalityTemplate
)

@admin.register(PermitStep)
class PermitStepAdmin(admin.ModelAdmin):
    list_display = ('order', 'project', 'title', 'status', 'date_issued')
    list_filter = ('project', 'status')
    search_fields = ('title', 'description', 'notes')
    ordering = ('project', 'order')

@admin.register(PermitChecklist)
class PermitChecklistAdmin(admin.ModelAdmin):
    list_display = ('get_name', 'project', 'status', 'get_progress')
    list_filter = ('status', 'project')

    def get_name(self, obj):
        return obj.template.name if obj.template else "Custom"
    get_name.short_description = "Name"

    def get_progress(self, obj):
        return f"{obj.progress_pct()}%"
    get_progress.short_description = "Progress"

@admin.register(ChecklistItem)
class ChecklistItemAdmin(admin.ModelAdmin):
    list_display = ('title', 'checklist', 'status')
    list_filter = ('status', 'checklist')

@admin.register(DeadlineReminder)
class DeadlineReminderAdmin(admin.ModelAdmin):
    list_display = ('get_title', 'remind_on', 'status')
    list_filter = ('status', 'remind_on')

    def get_title(self, obj):
        return obj.item.title
    get_title.short_description = "Title"

@admin.register(DocumentTemplate)
class DocumentTemplateAdmin(admin.ModelAdmin):
    list_display = ('label', 'category')
    list_filter = ('category',)

@admin.register(MunicipalityTemplate)
class MunicipalityTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'municipality', 'is_active')
    list_filter = ('is_active',)

@admin.register(MunicipalityStep)
class MunicipalityStepAdmin(admin.ModelAdmin):
    list_display = ('title', 'template', 'order')
    list_filter = ('template',)
