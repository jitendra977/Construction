from rest_framework import serializers
from .models import Task, TaskUpdate, TaskMedia
from apps.core.serializers import ConstructionPhaseSerializer, RoomSerializer
from apps.resources.serializers import ContractorSerializer

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
    assigned_to_detail = ContractorSerializer(source='assigned_to', read_only=True)
    
    updates = TaskUpdateSerializer(many=True, read_only=True)
    media = TaskMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Task
        fields = '__all__'
