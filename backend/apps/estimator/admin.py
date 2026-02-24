from django.contrib import admin
from .models import ConstructionRate

@admin.register(ConstructionRate)
class ConstructionRateAdmin(admin.ModelAdmin):
    list_display = ('label', 'key', 'value', 'unit', 'category', 'updated_at')
    list_filter = ('category',)
    search_fields = ('label', 'key')
