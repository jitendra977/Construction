from rest_framework import serializers
from ..models import WageStructure, PayrollRecord

class WageStructureSerializer(serializers.ModelSerializer):
    wage_type_display = serializers.CharField(source='get_wage_type_display', read_only=True)
    created_by_name = serializers.ReadOnlyField(source='created_by.get_full_name')

    class Meta:
        model = WageStructure
        fields = [
            'id', 'worker', 'effective_from', 'effective_to', 
            'wage_type', 'wage_type_display', 'base_amount', 'currency',
            'allowance_transport', 'allowance_food', 'allowance_housing', 
            'allowance_other', 'total_allowances', 'gross_amount',
            'overtime_multiplier', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]

class PayrollRecordSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    worker_name = serializers.ReadOnlyField(source='worker.full_name')
    project_name = serializers.ReadOnlyField(source='project.name')

    class Meta:
        model = PayrollRecord
        fields = [
            'id', 'worker', 'worker_name', 'project', 'project_name',
            'period_start', 'period_end', 'total_days_present', 
            'total_days_absent', 'total_days_leave', 'total_days_holiday',
            'total_overtime_hours', 'base_pay', 'overtime_pay', 
            'allowances', 'bonus', 'deduction_tax', 'deduction_advance', 
            'deduction_other', 'deduction_notes', 'net_pay', 'currency',
            'status', 'status_display', 'paid_date', 'payment_method', 
            'payment_method_display', 'payment_reference', 
            'approved_by', 'created_by', 'created_at', 'updated_at'
        ]
