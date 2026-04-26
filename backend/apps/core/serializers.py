from rest_framework import serializers
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideProgress, EmailLog, ProjectMember

# ── Project Member ─────────────────────────────────────────────────────────────
class ProjectMemberSerializer(serializers.ModelSerializer):
    username    = serializers.ReadOnlyField(source='user.username')
    email       = serializers.ReadOnlyField(source='user.email')
    full_name   = serializers.SerializerMethodField()
    role_display = serializers.ReadOnlyField(source='get_role_display')

    class Meta:
        model  = ProjectMember
        fields = ['id', 'project', 'user', 'username', 'email', 'full_name',
                  'role', 'role_display', 'note', 'joined_at']
        read_only_fields = ['id', 'joined_at']

    def get_full_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

# ── House Project ──────────────────────────────────────────────────────────────
class HouseProjectSerializer(serializers.ModelSerializer):
    category_allocation_total = serializers.ReadOnlyField()
    budget_health             = serializers.ReadOnlyField()
    member_count              = serializers.SerializerMethodField()
    phase_count               = serializers.SerializerMethodField()
    completed_phase_count     = serializers.SerializerMethodField()
    room_count                = serializers.SerializerMethodField()
    completed_room_count      = serializers.SerializerMethodField()
    total_spent               = serializers.SerializerMethodField()

    class Meta:
        model  = HouseProject
        fields = '__all__'

    def get_member_count(self, obj):
        return obj.members.count()

    def get_phase_count(self, obj):
        return obj.phases.count()

    def get_completed_phase_count(self, obj):
        return obj.phases.filter(status='COMPLETED').count()

    def get_room_count(self, obj):
        return Room.objects.filter(floor__project=obj).count()

    def get_completed_room_count(self, obj):
        return Room.objects.filter(floor__project=obj, status='COMPLETED').count()

    def get_total_spent(self, obj):
        from django.db.models import Sum
        try:
            from apps.finance.models import Expense
            result = Expense.objects.filter(project=obj).aggregate(total=Sum('amount'))['total']
            return float(result or 0)
        except Exception:
            return 0

# ── Construction Phase ─────────────────────────────────────────────────────────
class ConstructionPhaseSerializer(serializers.ModelSerializer):
    total_spent = serializers.SerializerMethodField()

    class Meta:
        model  = ConstructionPhase
        fields = '__all__'

    def get_total_spent(self, obj):
        from django.db.models import Sum
        return obj.expenses.aggregate(total=Sum('amount'))['total'] or 0

# ── Floor / Room ───────────────────────────────────────────────────────────────
class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Room
        fields = '__all__'

class FloorSerializer(serializers.ModelSerializer):
    rooms = RoomSerializer(many=True, read_only=True)

    class Meta:
        model  = Floor
        fields = '__all__'

# ── User Guide ─────────────────────────────────────────────────────────────────
class UserGuideStepSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserGuideStep
        fields = ['id', 'guide', 'order', 'text_en', 'text_ne', 'target_element', 'media', 'placement']

class UserGuideFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserGuideFAQ
        fields = ['id', 'guide', 'question_en', 'question_ne', 'answer_en', 'answer_ne', 'order']

class UserGuideSerializer(serializers.ModelSerializer):
    steps = UserGuideStepSerializer(many=True, read_only=True)
    faqs  = UserGuideFAQSerializer(many=True, read_only=True)

    class Meta:
        model  = UserGuide
        fields = [
            'id', 'key', 'is_active', 'type', 'icon', 'title_en', 'title_ne',
            'description_en', 'description_ne', 'video_url', 'order', 'steps', 'faqs'
        ]

class UserGuideProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserGuideProgress
        fields = ['guide', 'is_completed', 'last_step_seen', 'updated_at']

# ── Email Log ──────────────────────────────────────────────────────────────────
class EmailLogSerializer(serializers.ModelSerializer):
    sent_by_username = serializers.ReadOnlyField(source='sent_by.username')
    payment_amount   = serializers.ReadOnlyField(source='payment.amount')
    expense_title    = serializers.ReadOnlyField(source='expense.title')

    class Meta:
        model  = EmailLog
        fields = [
            'id', 'email_type', 'status', 'recipient_name', 'recipient_email',
            'subject', 'sent_by', 'sent_by_username', 'payment', 'payment_amount',
            'expense', 'expense_title', 'material', 'error_message', 'created_at'
        ]
