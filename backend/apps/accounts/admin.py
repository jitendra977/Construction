from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.safestring import mark_safe
from .models import User, Role, ActivityLog

@admin.register(Role)
class RoleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'can_manage_all_systems', 'can_manage_finances', 'can_manage_phases')
    search_fields = ('name', 'code')
    list_filter = ('can_manage_all_systems', 'can_manage_finances', 'can_manage_phases')

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_verified')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups', 'role', 'is_verified')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Profile Info', {
            'fields': (
                'role', 'phone_number', 'profile_image', 'bio', 'address',
                'preferred_language', 'notifications_enabled', 'is_verified', 
                'verification_token', 'frontend_last_login'
            )
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Custom Profile Info', {
            'fields': ('role', 'is_verified')
        }),
    )

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'model_name', 'object_repr', 'success')
    list_filter = ('action', 'model_name', 'success', 'timestamp')
    search_fields = ('user__username', 'description', 'object_repr')
    readonly_fields = [f.name for f in ActivityLog._meta.fields]
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
