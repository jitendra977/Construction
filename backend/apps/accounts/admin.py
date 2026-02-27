from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.safestring import mark_safe
from .models import User, Profile

class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    verbose_name_plural = 'Profile'
    readonly_fields = ('avatar_thumbnail',)

    def avatar_thumbnail(self, obj):
        if obj.avatar:
            return mark_safe(f'<img src="{obj.avatar.url}" width="50" height="50" style="border-radius: 50%; object-fit: cover;" />')
        return "No Avatar"
    avatar_thumbnail.short_description = 'Avatar'

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    inlines = (ProfileInline,)
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups', 'role')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role',)}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('role',)}),
    )

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('avatar_thumbnail', 'user', 'phone_number', 'preferred_language', 'notifications_enabled')
    search_fields = ('user__username', 'phone_number', 'address')
    readonly_fields = ('avatar_thumbnail',)

    def avatar_thumbnail(self, obj):
        if obj.avatar:
            return mark_safe(f'<img src="{obj.avatar.url}" width="50" height="50" style="border-radius: 50%; object-fit: cover;" />')
        return "No Avatar"
    avatar_thumbnail.short_description = 'Avatar'
