from django.contrib import admin
from .models import HouseProject, ConstructionPhase, Room, Floor

@admin.register(Floor)
class FloorAdmin(admin.ModelAdmin):
    list_display = ('name', 'level')
    ordering = ('level',)

@admin.register(HouseProject)
class HouseProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner_name', 'total_budget', 'start_date')
    search_fields = ('name', 'owner_name')

@admin.register(ConstructionPhase)
class ConstructionPhaseAdmin(admin.ModelAdmin):
    list_display = ('name', 'status', 'start_date', 'estimated_budget', 'order')
    list_filter = ('status',)
    search_fields = ('name',)
    ordering = ('order',)

@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'floor', 'status', 'budget_allocation')
    list_filter = ('floor', 'status')
    search_fields = ('name',)
