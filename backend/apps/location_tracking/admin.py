from django.contrib import admin
from .models import ProjectGeofence, StaffLocationLog, StaffPresenceSession


@admin.register(ProjectGeofence)
class ProjectGeofenceAdmin(admin.ModelAdmin):
    list_display  = ('name', 'project', 'latitude', 'longitude', 'radius_meters', 'fence_color', 'is_active', 'updated_at')
    list_filter   = ('is_active', 'project')
    search_fields = ('project__name', 'name')


@admin.register(StaffLocationLog)
class StaffLocationLogAdmin(admin.ModelAdmin):
    list_display    = ('user', 'project', 'geofence', 'is_on_site', 'accuracy', 'speed', 'timestamp')
    list_filter     = ('is_on_site', 'project')
    search_fields   = ('user__username', 'user__email')
    readonly_fields = ('timestamp',)


@admin.register(StaffPresenceSession)
class StaffPresenceSessionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'project', 'entry_at', 'exit_at', 'duration_minutes', 'last_ping_at', 'is_active')
    list_filter   = ('is_active', 'project')
    search_fields = ('user__username', 'user__email')


from .models import ProjectSitePin

@admin.register(ProjectSitePin)
class ProjectSitePinAdmin(admin.ModelAdmin):
    list_display  = ('name', 'pin_type', 'project', 'is_active', 'created_at')
    list_filter   = ('pin_type', 'is_active', 'project')
    search_fields = ('name', 'project__name')
