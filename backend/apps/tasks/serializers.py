from rest_framework import serializers
from .models import Task, TaskUpdate, TaskMedia
from apps.core.serializers import ConstructionPhaseSerializer, RoomSerializer


class AssignedMemberSerializer(serializers.Serializer):
    """Lightweight read-only serializer for the workforce member assigned to a task."""
    id = serializers.UUIDField()
    name = serializers.SerializerMethodField()
    employee_id = serializers.CharField()
    worker_type = serializers.CharField()
    status = serializers.CharField()
    phone = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.full_name

    def get_phone(self, obj):
        return obj.phone or ''


class TaskMediaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskMedia
        fields = '__all__'

class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskUpdate
        fields = '__all__'

class TaskSerializer(serializers.ModelSerializer):
    phase_detail = ConstructionPhaseSerializer(source='phase', read_only=True)
    room_detail = RoomSerializer(source='room', read_only=True)
    assigned_to_detail = AssignedMemberSerializer(source='assigned_to', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)

    updates = TaskUpdateSerializer(many=True, read_only=True)
    media = TaskMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
