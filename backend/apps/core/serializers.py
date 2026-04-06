from rest_framework import serializers
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress, EmailLog

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
        fields = ['id', 'guide', 'order', 'text_en', 'text_ne', 'target_element', 'media', 'placement']

class UserGuideFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGuideFAQ
        fields = ['id', 'guide', 'question_en', 'question_ne', 'answer_en', 'answer_ne', 'order']

class UserGuideSerializer(serializers.ModelSerializer):
    steps = UserGuideStepSerializer(many=True, read_only=True)
    faqs = UserGuideFAQSerializer(many=True, read_only=True)

    class Meta:
        model = UserGuide
        fields = [
            'id', 'key', 'is_active', 'type', 'icon', 'title_en', 'title_ne', 
            'description_en', 'description_ne', 'video_url', 'order', 'steps', 'faqs'
        ]

class UserGuideProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserGuideProgress
        fields = ['guide', 'is_completed', 'last_step_seen', 'updated_at']

class EmailLogSerializer(serializers.ModelSerializer):
    sent_by_username = serializers.ReadOnlyField(source='sent_by.username')
    payment_amount = serializers.ReadOnlyField(source='payment.amount')
    expense_title = serializers.ReadOnlyField(source='expense.title')

    class Meta:
        model = EmailLog
        fields = [
            'id', 'email_type', 'status', 'recipient_name', 'recipient_email', 
            'subject', 'sent_by', 'sent_by_username', 'payment', 'payment_amount',
            'expense', 'expense_title', 'material', 'error_message', 'created_at'
        ]
