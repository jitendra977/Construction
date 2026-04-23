from django.contrib import admin
from .models import (
    HouseProject, ConstructionPhase, Floor, Room, 
    UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress, EmailLog
)

@admin.register(HouseProject)
class HouseProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'total_budget', 'start_date', 'expected_completion_date')
    search_fields = ('name', 'owner_name', 'address')

@admin.register(ConstructionPhase)
class ConstructionPhaseAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'project', 'status', 'start_date', 'estimated_budget')
    list_filter = ('project', 'status')
    search_fields = ('name',)
    ordering = ('project', 'order')

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('project', 'level', 'name')
    list_filter = ('project',)
    ordering = ('project', 'level')

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'floor', 'project_name', 'status', 'budget_allocation')
    list_filter = ('floor__project', 'status')
    search_fields = ('name',)

    def project_name(self, obj):
        return obj.floor.project.name if obj.floor.project else "-"
    project_name.short_description = "Project"

@admin.register(UserGuide)
class UserGuideAdmin(admin.ModelAdmin):
    list_display = ('title_en', 'key', 'type', 'order', 'is_active')
    list_filter = ('type', 'is_active')
    search_fields = ('title_en', 'key')

@admin.register(UserGuideStep)
class UserGuideStepAdmin(admin.ModelAdmin):
    list_display = ('guide', 'order', 'text_en')
    list_filter = ('guide',)

@admin.register(UserGuideFAQ)
class UserGuideFAQAdmin(admin.ModelAdmin):
    list_display = ('guide', 'question_en', 'order')
    list_filter = ('guide',)

@admin.register(UserGuideProgress)
class UserGuideProgressAdmin(admin.ModelAdmin):
    list_display = ('user', 'guide', 'is_completed', 'last_step_seen', 'updated_at')
    list_filter = ('is_completed', 'guide')

@admin.register(EmailLog)
class EmailLogAdmin(admin.ModelAdmin):
    list_display = ('recipient_email', 'email_type', 'status', 'created_at', 'sent_by')
    list_filter = ('status', 'email_type', 'created_at')
    search_fields = ('recipient_email', 'subject')
