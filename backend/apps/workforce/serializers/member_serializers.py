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

    def create(self, validated_data):
        # Explicitly map properties to underscore fields for the model constructor
        validated_data['_first_name'] = validated_data.pop('first_name', '')
        validated_data['_last_name']  = validated_data.pop('last_name', '')
        validated_data['_email']      = validated_data.pop('email', '')
        validated_data['_phone']      = validated_data.pop('phone', '')
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Pop the smart-property fields so they don't land in super().update()
        first_name = validated_data.pop('first_name', None)
        last_name  = validated_data.pop('last_name',  None)
        email      = validated_data.pop('email',      None)
        phone      = validated_data.pop('phone',      None)

        # Always write to the local underscore columns
        if first_name is not None:
            instance._first_name = first_name
        if last_name is not None:
            instance._last_name = last_name
        if email is not None:
            instance._email = email
        if phone is not None:
            instance._phone = phone

        # If the member has a linked User account, keep it in sync.
        # The model's first_name / last_name / email / phone properties read
        # from the account, so changes to the underscore fields alone are
        # invisible in the UI when an account is linked.
        account = instance.account
        if account:
            account_dirty = False
            if first_name is not None and account.first_name != first_name:
                account.first_name = first_name
                account_dirty = True
            if last_name is not None and account.last_name != last_name:
                account.last_name = last_name
                account_dirty = True
            # Only sync email if the account is NOT using the auto-generated
            # worker.local placeholder (which is the login identity placeholder).
            if (email is not None
                    and email
                    and not account.email.endswith('@worker.local')
                    and account.email != email):
                account.email = email
                account_dirty = True
            # Sync phone_number field if the User model has it.
            if phone is not None and hasattr(account, 'phone_number'):
                if account.phone_number != phone:
                    account.phone_number = phone
                    account_dirty = True
            if account_dirty:
                update_fields = ['first_name', 'last_name']
                if email is not None and email and not account.email.endswith('@worker.local'):
                    update_fields.append('email')
                if phone is not None and hasattr(account, 'phone_number'):
                    update_fields.append('phone_number')
                account.save(update_fields=update_fields)

        return super().update(instance, validated_data)

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
        tz_cache = self.context.setdefault('_tz_cache', {})
        member_id = str(obj.pk)
        if member_id not in cache:
            aw = obj.attendance_worker
            if not aw:
                cache[member_id] = None
            else:
                import datetime
                import pytz
                from apps.attendance.models import DailyAttendance
                
                project_id = obj.current_project_id
                if project_id not in tz_cache:
                    try:
                        tz_name = aw.project.attendance_settings.timezone
                        tz_cache[project_id] = pytz.timezone(tz_name)
                    except Exception:
                        from django.utils import timezone
                        tz_cache[project_id] = timezone.get_default_timezone()
                
                tz = tz_cache[project_id]
                today = datetime.datetime.now(tz).date()

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
