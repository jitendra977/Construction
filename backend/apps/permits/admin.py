from django.contrib import admin
from .models import PermitStep
@admin.register(PermitStep)
class PermitStepAdmin(admin.ModelAdmin):
    list_display = ('order', 'title', 'status', 'date_issued')
    list_filter = ('status',)
    search_fields = ('title', 'description', 'notes')
    ordering = ('order',)

