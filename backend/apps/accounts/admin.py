from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Profile

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
