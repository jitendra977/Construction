from rest_framework import serializers
from ..models import WorkforceMember
from .skill_serializers import WorkerSkillSerializer
from .document_serializers import WorkerDocumentSerializer, WorkerContractSerializer
from .details_serializers import EmergencyContactSerializer, SafetyRecordSerializer, PerformanceLogSerializer
from .payroll_serializers import WageStructureSerializer, PayrollRecordSerializer
from .tracking_serializers import WorkerAssignmentSerializer, WorkerEvaluationSerializer

class WorkforceMemberSerializer(serializers.ModelSerializer):
    # Smart Properties (Prefer User account data)
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    email = serializers.EmailField(allow_blank=True)
    phone = serializers.CharField(allow_blank=True)
    photo = serializers.ImageField(read_only=True) # Photo is handled specially

    # Meta / Read-only
    full_name = serializers.ReadOnlyField()
    is_active = serializers.ReadOnlyField()
    has_attendance_link = serializers.ReadOnlyField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    worker_type_display = serializers.CharField(source='get_worker_type_display', read_only=True)
    role_name = serializers.ReadOnlyField(source='role.title')
    project_name = serializers.ReadOnlyField(source='current_project.name')

    # Nested Relations (Detailed View)
    skills = WorkerSkillSerializer(many=True, read_only=True)
    documents = WorkerDocumentSerializer(many=True, read_only=True)
    contracts = WorkerContractSerializer(many=True, read_only=True)
    emergency_contacts = EmergencyContactSerializer(many=True, read_only=True)
    wage_structures = WageStructureSerializer(many=True, read_only=True)
    evaluations = WorkerEvaluationSerializer(many=True, read_only=True)
    
    # Summary stats
    last_evaluation_rating = serializers.SerializerMethodField()

    class Meta:
        model = WorkforceMember
        fields = [
            'id', 'account', 'employee_id', 'first_name', 'last_name', 'full_name',
            'gender', 'date_of_birth', 'photo', 'nationality', 'language',
            'phone', 'phone_alt', 'email', 'address', 'worker_type', 
            'worker_type_display', 'role', 'role_name', 'status', 'status_display', 
            'join_date', 'end_date', 'current_project', 'project_name',
            'is_active', 'has_attendance_link', 'attendance_worker',
            'skills', 'documents', 'contracts', 'emergency_contacts',
            'wage_structures', 'evaluations', 'last_evaluation_rating',
            'created_by', 'created_at', 'updated_at'
        ]

    def get_last_evaluation_rating(self, obj):
        last_eval = obj.evaluations.order_by('-eval_date').first()
        return last_eval.overall_score if last_eval else None

class WorkforceMemberListSerializer(serializers.ModelSerializer):
    """
    Slimmed-down serializer for high-performance list views.
    Includes live attendance data pulled from the linked AttendanceWorker
    so the WorkforceHub members table can show today's check-in status
    without a separate API call.
    """
    full_name      = serializers.ReadOnlyField()
    name           = serializers.ReadOnlyField(source='full_name')
    role_name      = serializers.ReadOnlyField(source='role.title')
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    project_name   = serializers.ReadOnlyField(source='current_project.name')
    photo          = serializers.ImageField(read_only=True)

    # Attendance bridge — populated via SerializerMethodField so we can
    # include live today-data without hitting N+1 queries (caller should
    # prefetch/select_related attendance_worker).
    has_attendance_link = serializers.ReadOnlyField()
    daily_rate          = serializers.ReadOnlyField()   # from attendance_worker
    qr_token            = serializers.ReadOnlyField()   # from attendance_worker
    today_status        = serializers.SerializerMethodField()
    today_check_in      = serializers.SerializerMethodField()
    today_check_out     = serializers.SerializerMethodField()
    attendance_worker_id = serializers.SerializerMethodField()

    class Meta:
        model = WorkforceMember
        fields = [
            'id', 'account', 'employee_id', 'full_name', 'name', 'photo', 'phone',
            'worker_type', 'role', 'role_name', 'status', 'status_display',
            'current_project', 'project_name',
            # Attendance live data
            'has_attendance_link', 'attendance_worker_id',
            'daily_rate', 'qr_token',
            'today_status', 'today_check_in', 'today_check_out',
        ]

    def _get_today_record(self, obj):
        """
        Return today's DailyAttendance for this member (if any).
        Cached on the serializer context so multiple fields share one lookup.
        """
        cache = self.context.setdefault('_today_cache', {})
        member_id = str(obj.pk)
        if member_id not in cache:
            aw = obj.attendance_worker
            if not aw:
                cache[member_id] = None
            else:
                from django.utils import timezone
                from apps.attendance.models import DailyAttendance
                today = timezone.localdate()
                try:
                    cache[member_id] = DailyAttendance.objects.filter(
                        worker=aw, date=today
                    ).first()
                except Exception:
                    cache[member_id] = None
        return cache[member_id]

    def get_today_status(self, obj):
        rec = self._get_today_record(obj)
        return rec.status if rec else 'NOT_MARKED'

    def get_today_check_in(self, obj):
        rec = self._get_today_record(obj)
        return rec.check_in.strftime('%H:%M') if rec and rec.check_in else None

    def get_today_check_out(self, obj):
        rec = self._get_today_record(obj)
        return rec.check_out.strftime('%H:%M') if rec and rec.check_out else None

    def get_attendance_worker_id(self, obj):
        return obj.attendance_worker_id  # raw FK int, no extra query
