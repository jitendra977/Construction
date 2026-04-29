from rest_framework import serializers
from .models import HouseProject, ConstructionPhase, Room, Floor, UserGuide, UserGuideStep, UserGuideFAQ, UserGuideSection, UserGuideProgress, EmailLog, ProjectMember

# ── Project Member ─────────────────────────────────────────────────────────────
class ProjectMemberSerializer(serializers.ModelSerializer):
    username     = serializers.ReadOnlyField(source='user.username')
    email        = serializers.ReadOnlyField(source='user.email')
    full_name    = serializers.SerializerMethodField()
    role_display = serializers.ReadOnlyField(source='get_role_display')
    profile_image = serializers.SerializerMethodField()
    workforce_id  = serializers.SerializerMethodField()

    class Meta:
        model  = ProjectMember
        fields = [
            'id', 'project', 'user', 'username', 'email', 'full_name', 'profile_image',
            'workforce_id',
            'role', 'role_display', 'note', 'joined_at',
            # Granular permission flags
            'can_manage_members', 'can_manage_finances', 'can_view_finances',
            'can_manage_phases',  'can_manage_structure',
            'can_manage_resources', 'can_upload_media',
            'can_manage_workforce', 'can_approve_purchases',
        ]
        read_only_fields = ['id', 'joined_at', 'username', 'email', 'full_name', 'profile_image', 'role_display', 'workforce_id']

    def get_workforce_id(self, obj):
        if hasattr(obj.user, 'workforce_profile') and obj.user.workforce_profile:
            return obj.user.workforce_profile.id
        return None

    def get_full_name(self, obj):
        u = obj.user
        return f"{u.first_name} {u.last_name}".strip() or u.username

    def get_profile_image(self, obj):
        try:
            if obj.user.profile_image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(obj.user.profile_image.url)
                return obj.user.profile_image.url
        except Exception:
            pass
        return None

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
    added_by_name = serializers.SerializerMethodField()

    def get_added_by_name(self, obj):
        if obj.added_by:
            return obj.added_by.get_full_name() or obj.added_by.username
        return None

    class Meta:
        model  = UserGuideStep
        fields = [
            'id', 'guide', 'order', 'text_en', 'text_ne',
            'target_element', 'media', 'placement',
            'added_by', 'added_by_name', 'created_at',
        ]
        read_only_fields = ['added_by', 'created_at']


class UserGuideFAQSerializer(serializers.ModelSerializer):
    added_by_name = serializers.SerializerMethodField()

    def get_added_by_name(self, obj):
        if obj.added_by:
            return obj.added_by.get_full_name() or obj.added_by.username
        return None

    class Meta:
        model  = UserGuideFAQ
        fields = [
            'id', 'guide', 'question_en', 'question_ne',
            'answer_en', 'answer_ne', 'order',
            'added_by', 'added_by_name', 'created_at',
        ]
        read_only_fields = ['added_by', 'created_at']


class UserGuideSectionSerializer(serializers.ModelSerializer):
    added_by_name = serializers.SerializerMethodField()

    def get_added_by_name(self, obj):
        if obj.added_by:
            return obj.added_by.get_full_name() or obj.added_by.username
        return None

    class Meta:
        model  = UserGuideSection
        fields = [
            'id', 'guide', 'section_type', 'title_en', 'title_ne',
            'content_en', 'content_ne', 'order', 'is_approved',
            'added_by', 'added_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['added_by', 'created_at', 'updated_at']


class UserGuideSerializer(serializers.ModelSerializer):
    steps    = UserGuideStepSerializer(many=True, read_only=True)
    faqs     = UserGuideFAQSerializer(many=True, read_only=True)
    sections = UserGuideSectionSerializer(many=True, read_only=True)

    class Meta:
        model  = UserGuide
        fields = [
            'id', 'key', 'is_active', 'type', 'icon', 'title_en', 'title_ne',
            'description_en', 'description_ne', 'video_url', 'order',
            'created_at', 'updated_at',
            'steps', 'faqs', 'sections',
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
