from rest_framework import serializers
from ..models import WorkerAssignment, WorkerEvaluation

class WorkerAssignmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    project_name = serializers.ReadOnlyField(source='project.name')
    phase_name = serializers.ReadOnlyField(source='phase.name')
    task_name = serializers.ReadOnlyField(source='task.name')

    class Meta:
        model = WorkerAssignment
        fields = [
            'id', 'worker', 'project', 'project_name', 'phase', 'phase_name',
            'task', 'task_name', 'start_date', 'end_date', 'status',
            'status_display', 'role_override', 'estimated_hours', 'actual_hours'
        ]

class WorkerEvaluationSerializer(serializers.ModelSerializer):
    average_rating = serializers.ReadOnlyField(source='overall_score')
    recommendation_display = serializers.CharField(source='get_recommendation_display', read_only=True)
    evaluator_name = serializers.ReadOnlyField(source='evaluator.get_full_name')
    project_name = serializers.ReadOnlyField(source='project.name')

    class Meta:
        model = WorkerEvaluation
        fields = [
            'id', 'worker', 'evaluator', 'evaluator_name', 'project', 'project_name',
            'eval_date', 'score_punctuality', 'score_quality', 'score_safety',
            'score_teamwork', 'score_productivity', 'attendance_days_present',
            'attendance_days_absent', 'attendance_late_count', 'attendance_early_out_count',
            'recommendation', 'recommendation_display', 'comments', 'is_shared',
            'average_rating', 'created_at', 'updated_at'
        ]

