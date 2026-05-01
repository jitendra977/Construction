from rest_framework import serializers
from ..models import WorkerAssignment, WorkerEvaluation

class WorkerAssignmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    worker_name = serializers.ReadOnlyField(source='worker.full_name')
    project_name = serializers.ReadOnlyField(source='project.name')
    phase_name = serializers.ReadOnlyField(source='phase.name')
    task_name = serializers.ReadOnlyField(source='task.title')
    role_name = serializers.SerializerMethodField()
    role_display = serializers.ReadOnlyField(source='role_override.title')

    class Meta:
        model = WorkerAssignment
        fields = [
            'id', 'worker', 'worker_name', 'project', 'project_name', 'phase', 'phase_name',
            'task', 'task_name', 'start_date', 'end_date', 'status',
            'status_display', 'role_override', 'role_name', 'role_display',
            'estimated_hours', 'actual_hours'
        ]

    def get_role_name(self, obj):
        # 1. Assignment override
        if obj.role_override:
            return obj.role_override.title
        
        # 2. Worker primary role
        if obj.worker.role:
            return obj.worker.role.title
            
        # 3. Fallback to trade from attendance worker
        if obj.worker.attendance_worker:
            return obj.worker.attendance_worker.get_trade_display()

        # 4. Final fallback
        return "General Labour"

class WorkerEvaluationSerializer(serializers.ModelSerializer):
    average_rating = serializers.ReadOnlyField(source='overall_score')
    recommendation_display = serializers.CharField(source='get_recommendation_display', read_only=True)
    evaluator_name = serializers.ReadOnlyField(source='evaluator.get_full_name')
    worker_name = serializers.ReadOnlyField(source='worker.full_name')
    project_name = serializers.ReadOnlyField(source='project.name')

    class Meta:
        model = WorkerEvaluation
        fields = [
            'id', 'worker', 'worker_name', 'evaluator', 'evaluator_name', 'project', 'project_name',
            'eval_date', 'score_punctuality', 'score_quality', 'score_safety',
            'score_teamwork', 'score_productivity', 'attendance_days_present',
            'attendance_days_absent', 'attendance_late_count', 'attendance_early_out_count',
            'recommendation', 'recommendation_display', 'comments', 'is_shared',
            'average_rating', 'created_at', 'updated_at'
        ]

