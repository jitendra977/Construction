from rest_framework import serializers
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress

class HouseProjectSerializer(serializers.ModelSerializer):
    category_allocation_total = serializers.ReadOnlyField()
    budget_health = serializers.ReadOnlyField()

    class Meta:
        model = HouseProject
        fields = '__all__'

class ConstructionPhaseSerializer(serializers.ModelSerializer):
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model = ConstructionPhase
        fields = '__all__'

    def get_total_spent(self, obj):
        from django.db.models import Sum
        return obj.expenses.aggregate(total=Sum('amount'))['total'] or 0

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = '__all__'

class FloorSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)

    class Meta:
        model = Floor
        fields = '__all__'

class UserGuideStepSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGuideStep
        fields = ['order', 'text_en', 'text_ne', 'target_element', 'media', 'placement']

class UserGuideFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGuideFAQ
        fields = ['question_en', 'question_ne', 'answer_en', 'answer_ne', 'order']

class UserGuideSerializer(serializers.ModelSerializer):
    steps = UserGuideStepSerializer(many=True, read_only=True)
    faqs = UserGuideFAQSerializer(many=True, read_only=True)

    class Meta:
        model = UserGuide
        fields = [
            'id', 'key', 'is_active', 'type', 'icon', 'title_en', 'title_ne', 
            'description_en', 'description_ne', 'video_url', 'steps', 'faqs'
        ]

class UserGuideProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGuideProgress
        fields = ['guide', 'is_completed', 'last_step_seen', 'updated_at']
