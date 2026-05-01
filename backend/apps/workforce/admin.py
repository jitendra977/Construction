from django.contrib import admin
from .models import (
    WorkforceCategory, WorkforceRole, WorkforceMember,
    Skill, WorkerSkill, WorkerDocument, WorkerContract,
    EmergencyContact, SafetyRecord, PerformanceLog,
    WorkerAssignment, PayrollRecord,
    WageStructure, WorkerEvaluation
)

class EmergencyContactInline(admin.StackedInline):
    model = EmergencyContact
    extra = 1

class WorkerSkillInline(admin.TabularInline):
    model = WorkerSkill
    extra = 1

class WorkerDocumentInline(admin.TabularInline):
    model = WorkerDocument
    extra = 1

@admin.register(WorkforceMember)
class WorkforceMemberAdmin(admin.ModelAdmin):
    list_display = ['employee_id', '_first_name', '_last_name', 'worker_type', 'role', 'status', 'current_project']
    list_filter = ['worker_type', 'status', 'gender', 'current_project']
    search_fields = ['_first_name', '_last_name', 'employee_id', '_phone']
    inlines = [EmergencyContactInline, WorkerSkillInline, WorkerDocumentInline]
    readonly_fields = ['employee_id', 'created_at', 'updated_at']
    fieldsets = [
        ('Identity', {'fields': ['employee_id', 'account', ('_first_name', '_last_name'), 'gender', 'date_of_birth', '_photo', 'nationality', 'language']}),
        ('Contact', {'fields': [('_phone', 'phone_alt'), '_email', 'address']}),
        ('Classification', {'fields': ['worker_type', 'role', 'status', 'current_project']}),
        ('Employment', {'fields': ['join_date', 'end_date']}),
        ('Metadata', {'fields': ['created_by', 'created_at', 'updated_at']}),
    ]

@admin.register(WorkforceCategory)
class WorkforceCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'parent', 'order', 'is_active']
    list_editable = ['order', 'is_active']
    search_fields = ['name']

@admin.register(WorkforceRole)
class WorkforceRoleAdmin(admin.ModelAdmin):
    list_display = ['title', 'code', 'trade_code', 'category', 'default_wage_type', 'default_wage_amount', 'is_active']
    list_filter = ['category', 'default_wage_type', 'is_active']
    search_fields = ['title', 'code']

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ['name', 'trade_type', 'is_active']
    list_filter = ['trade_type', 'is_active']
    search_fields = ['name']

@admin.register(WorkerContract)
class WorkerContractAdmin(admin.ModelAdmin):
    list_display = ['worker', 'contract_type', 'status', 'start_date', 'end_date', 'wage_amount']
    list_filter = ['contract_type', 'status']
    search_fields = ['worker___first_name', 'worker___last_name']

@admin.register(PayrollRecord)
class PayrollRecordAdmin(admin.ModelAdmin):
    list_display = ['worker', 'period_start', 'period_end', 'status', 'net_pay']
    list_filter = ['status']
    search_fields = ['worker___first_name', 'worker___last_name']

@admin.register(SafetyRecord)
class SafetyRecordAdmin(admin.ModelAdmin):
    list_display = ['worker', 'incident_type', 'severity', 'status', 'incident_date']
    list_filter = ['incident_type', 'severity', 'status']
    search_fields = ['worker___first_name', 'worker___last_name', 'description']

@admin.register(WorkerAssignment)
class WorkerAssignmentAdmin(admin.ModelAdmin):
    list_display = ['worker', 'project', 'start_date', 'end_date', 'status']
    list_filter = ['status', 'project']
    search_fields = ['worker___first_name', 'worker___last_name']

@admin.register(WorkerEvaluation)
class WorkerEvaluationAdmin(admin.ModelAdmin):
    list_display = ['worker', 'project', 'eval_date', 'recommendation', 'overall_score']
    list_filter = ['recommendation', 'project']
    search_fields = ['worker___first_name', 'worker___last_name']

# Register remaining models with basic admin
admin.site.register(WageStructure)
admin.site.register(PerformanceLog)
admin.site.register(WorkerSkill)
admin.site.register(WorkerDocument)
admin.site.register(EmergencyContact)
