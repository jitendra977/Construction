from django.contrib import admin
from .models import PermitStep, LegalDocument

@admin.register(PermitStep)
class PermitStepAdmin(admin.ModelAdmin):
    list_display = ('order', 'title', 'status', 'date_issued')
    list_filter = ('status',)
    search_fields = ('title', 'description', 'notes')
    ordering = ('order',)

@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'upload_date')
    list_filter = ('document_type', 'upload_date')
    search_fields = ('title', 'notes')
