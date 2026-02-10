from rest_framework import serializers
from .models import HouseProject, ConstructionPhase, Room, Floor

class HouseProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = HouseProject
        fields = '__all__'

class ConstructionPhaseSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConstructionPhase
        fields = '__all__'

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

class FloorSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)

    class Meta:
        model = Floor
        fields = '__all__'
