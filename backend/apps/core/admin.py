from django.contrib import admin
from .models import HouseProject, ConstructionPhase, Floor, Room

@admin.register(HouseProject)
class HouseProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'total_budget', 'start_date', 'expected_completion_date')
    search_fields = ('name', 'owner_name', 'address')

@admin.register(ConstructionPhase)
class ConstructionPhaseAdmin(admin.ModelAdmin):
    list_display = ('order', 'name', 'status', 'start_date', 'end_date', 'estimated_budget')
    list_filter = ('status',)
    search_fields = ('name',)
    ordering = ('order',)

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('level', 'name')
    ordering = ('level',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'floor', 'area_sqft', 'status', 'budget_allocation')
    list_filter = ('floor', 'status')
    search_fields = ('name',)
