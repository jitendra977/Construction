from rest_framework import serializers
from .models import Task, TaskUpdate, TaskMedia
from apps.core.serializers import ConstructionPhaseSerializer, RoomSerializer
from utils.file_validation import TASK_MEDIA_EXTENSIONS, validate_safe_upload


class AssignedMemberSerializer(serializers.Serializer):
    """Lightweight read-only serializer for a single assigned WorkforceMember."""
    id          = serializers.UUIDField()
    name        = serializers.SerializerMethodField()
    employee_id = serializers.CharField()
    worker_type = serializers.CharField()
    status      = serializers.CharField()
    phone       = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.full_name

    def get_phone(self, obj):
        return obj.phone or ''


class AssignedTeamSerializer(serializers.Serializer):
    """Lightweight read-only serializer for an auto-assigned Team."""
    id           = serializers.IntegerField()
    name         = serializers.CharField()
    member_count = serializers.SerializerMethodField()
    members      = serializers.SerializerMethodField()

    def get_member_count(self, obj):
        return obj.members.count()

    def get_members(self, obj):
        return [
            {'id': str(m.id), 'name': m.full_name, 'employee_id': m.employee_id}
            for m in obj.members.all()[:20]
        ]


class TaskMediaSerializer(serializers.ModelSerializer):
    def validate_file(self, value):
        return validate_safe_upload(
            value,
            allowed_extensions=TASK_MEDIA_EXTENSIONS,
            label="task media",
        )

    def validate(self, attrs):
        task = attrs.get('task') or getattr(self.instance, 'task', None)
        project = attrs.get('project') or getattr(self.instance, 'project', None)
        if task:
            attrs['project'] = task.phase.project
        elif not project:
            request = self.context.get('request')
            project_id = request.data.get('project') if request else None
            if project_id:
                attrs['project_id'] = project_id
        return attrs

    class Meta:
        model  = TaskMedia
        fields = '__all__'


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TaskUpdate
        fields = '__all__'


class TaskSerializer(serializers.ModelSerializer):
    phase_detail        = ConstructionPhaseSerializer(source='phase', read_only=True)
    room_detail         = RoomSerializer(source='room', read_only=True)
    assigned_to_detail  = AssignedMemberSerializer(source='assigned_to', read_only=True)
    assigned_team_detail = AssignedTeamSerializer(source='assigned_team', read_only=True)
    category_name       = serializers.CharField(source='category.name', read_only=True)

    # 'individual' | 'team' | 'unassigned'  — convenient for the frontend
    assignment_type = serializers.SerializerMethodField()

    updates = TaskUpdateSerializer(many=True, read_only=True)
    media   = TaskMediaSerializer(many=True, read_only=True)

    def get_assignment_type(self, obj):
        if obj.assigned_team_id:
            return 'team'
        if obj.assigned_to_id:
            return 'individual'
        return 'unassigned'

    class Meta:
        model  = Task
        fields = '__all__'
