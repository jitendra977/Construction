from rest_framework import serializers
from .models import AttendanceWorker, DailyAttendance, QRScanLog, ScanTimeWindow, ProjectHoliday, ProjectAttendanceSettings


class AttendanceWorkerSerializer(serializers.ModelSerializer):
    trade_display       = serializers.CharField(source="get_trade_display", read_only=True)
    worker_type_display = serializers.CharField(source="get_worker_type_display", read_only=True)
    effective_ot_rate   = serializers.DecimalField(
        source="effective_overtime_rate", max_digits=10, decimal_places=2, read_only=True
    )
    member_role       = serializers.CharField(source="project_member.role", read_only=True, default=None)
    member_user_name  = serializers.SerializerMethodField()
    member_user_email = serializers.SerializerMethodField()
    member_user_avatar= serializers.SerializerMethodField()

    # ── Account status (linked_user) ──────────────────────────────────────────
    has_account        = serializers.SerializerMethodField()
    account_email      = serializers.SerializerMethodField()
    account_username   = serializers.SerializerMethodField()
    account_name       = serializers.SerializerMethodField()
    workforce_id       = serializers.SerializerMethodField()

    # ── Linked Contractor (resources.Contractor) ───────────────────────────────
    contractor_id      = serializers.IntegerField(source="contractor.id",   read_only=True, default=None)
    contractor_name    = serializers.CharField(source="contractor.name",    read_only=True, default=None)
    contractor_role    = serializers.CharField(source="contractor.role",    read_only=True, default=None)
    contractor_phone   = serializers.CharField(source="contractor.phone",   read_only=True, default=None)
    contractor_email   = serializers.CharField(source="contractor.email",   read_only=True, default=None)
    has_contractor     = serializers.SerializerMethodField()

    class Meta:
        model  = AttendanceWorker
        fields = [
            "id", "project", "name", "trade", "trade_display",
            "worker_type", "worker_type_display",
            "daily_rate", "overtime_rate_per_hour", "effective_ot_rate",
            "phone", "address", "linked_user", "project_member",
            "member_role", "member_user_name", "member_user_email", "member_user_avatar",
            "has_account", "account_email", "account_username", "account_name",
            "is_active", "joined_date", "notes",
            # Per-worker custom scan window
            "use_custom_window",
            "custom_checkin_start", "custom_checkin_end",
            "custom_checkout_start", "custom_checkout_end",
            "qr_token",
            # Contractor link
            "contractor", "contractor_id", "contractor_name",
            "contractor_role", "contractor_phone", "contractor_email",
            "has_contractor",
            "workforce_id",
            "created_at", "updated_at",
        ]
        read_only_fields = ["qr_token", "workforce_id", "created_at", "updated_at"]

    def get_workforce_id(self, obj):
        if hasattr(obj, 'workforce_member') and obj.workforce_member:
            return obj.workforce_member.id
        return None

    def get_member_user_name(self, obj):
        if obj.project_member and obj.project_member.user:
            u = obj.project_member.user
            return u.get_full_name() or u.username
        return None

    def get_member_user_email(self, obj):
        if obj.project_member and obj.project_member.user:
            return obj.project_member.user.email
        return None

    def get_member_user_avatar(self, obj):
        if obj.project_member and obj.project_member.user:
            try:
                if obj.project_member.user.profile_image:
                    request = self.context.get("request")
                    if request:
                        return request.build_absolute_uri(obj.project_member.user.profile_image.url)
            except Exception:
                pass
        return None

    def get_has_contractor(self, obj):
        return obj.contractor_id is not None

    def get_has_account(self, obj):
        return obj.linked_user_id is not None

    def get_account_email(self, obj):
        return obj.linked_user.email if obj.linked_user_id and obj.linked_user else None

    def get_account_username(self, obj):
        return obj.linked_user.username if obj.linked_user_id and obj.linked_user else None

    def get_account_name(self, obj):
        if obj.linked_user_id and obj.linked_user:
            return obj.linked_user.get_full_name() or obj.linked_user.username
        return None


class DailyAttendanceSerializer(serializers.ModelSerializer):
    worker_name    = serializers.CharField(source="worker.name", read_only=True)
    worker_trade   = serializers.CharField(source="worker.get_trade_display", read_only=True)
    worker_type    = serializers.CharField(source="worker.worker_type", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    wage_earned    = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    effective_days = serializers.DecimalField(max_digits=4, decimal_places=2, read_only=True)

    class Meta:
        model  = DailyAttendance
        fields = [
            "id", "worker", "worker_name", "worker_trade", "worker_type",
            "project", "date", "status", "status_display",
            "check_in", "check_out", "overtime_hours",
            "daily_rate_snapshot", "overtime_rate_snapshot",
            "wage_earned", "effective_days",
            "notes", "recorded_by",
            "created_at", "updated_at",
        ]
        read_only_fields = ["daily_rate_snapshot", "overtime_rate_snapshot", "created_at", "updated_at"]


class BulkAttendanceSerializer(serializers.Serializer):
    project = serializers.IntegerField()
    date    = serializers.DateField()
    records = serializers.ListField(child=serializers.DictField())


class QRScanLogSerializer(serializers.ModelSerializer):
    worker_name     = serializers.CharField(source="worker.name", read_only=True)
    scanned_by_name = serializers.SerializerMethodField()
    scan_type_display   = serializers.CharField(source="get_scan_type_display",   read_only=True)
    scan_status_display = serializers.CharField(source="get_scan_status_display", read_only=True)

    class Meta:
        model  = QRScanLog
        fields = [
            "id", "worker", "worker_name", "attendance",
            "scan_type", "scan_type_display",
            "scan_status", "scan_status_display",
            "is_late", "is_early",
            "scanned_at",
            "scanned_by", "scanned_by_name",
            "ip_address", "note",
        ]

    def get_scanned_by_name(self, obj):
        if obj.scanned_by:
            return obj.scanned_by.get_full_name() or obj.scanned_by.username
        return "Kiosk / Anonymous"


class ScanTimeWindowSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ScanTimeWindow
        fields = [
            "id", "project",
            "checkin_start", "checkin_end",
            "checkout_start", "checkout_end",
            "is_active",
            "late_threshold_minutes", "early_checkout_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PersonRolesSerializer(serializers.Serializer):
    """
    Flat serializer for the unified /persons/ endpoint.
    One entry per real person — shows which roles they have enabled.
    """
    # ── Core identity (from AttendanceWorker as master) ───────────────────────
    worker_id    = serializers.IntegerField()
    name         = serializers.CharField()
    trade        = serializers.CharField()
    trade_label  = serializers.CharField()
    worker_type  = serializers.CharField()
    phone        = serializers.CharField()
    daily_rate   = serializers.DecimalField(max_digits=10, decimal_places=2)
    is_active    = serializers.BooleanField()
    joined_date  = serializers.DateField(allow_null=True)
    notes        = serializers.CharField()

    # ── Today's attendance snapshot ───────────────────────────────────────────
    today_status   = serializers.CharField(allow_null=True)
    today_check_in  = serializers.CharField(allow_null=True)
    today_check_out = serializers.CharField(allow_null=True)

    # ── Role: Attendance tracking ─────────────────────────────────────────────
    role_attendance = serializers.BooleanField()   # always True for worker-based rows
    qr_token        = serializers.UUIDField(allow_null=True)

    # ── Role: Payment / Contractor ────────────────────────────────────────────
    role_payment      = serializers.BooleanField()
    contractor_id     = serializers.IntegerField(allow_null=True)
    contractor_role   = serializers.CharField(allow_null=True)
    contractor_role_label = serializers.CharField(allow_null=True)
    total_paid        = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    balance_due       = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    in_sync           = serializers.BooleanField()

    # ── Role: Login account ───────────────────────────────────────────────────
    role_login    = serializers.BooleanField()
    user_id       = serializers.IntegerField(allow_null=True)
    user_email    = serializers.CharField(allow_null=True)
    user_name     = serializers.CharField(allow_null=True)

    # ── Grouping ──────────────────────────────────────────────────────────────
    workforce_id  = serializers.UUIDField(allow_null=True)
    teams         = serializers.SerializerMethodField()

    def get_teams(self, obj):
        # obj is the AttendanceWorker instance
        return [
            {"id": t.id, "name": t.name}
            for t in obj.teams.all()
        ]


class ProjectHolidaySerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProjectHoliday
        fields = ["id", "project", "date", "name", "notes", "applied", "created_at"]
        read_only_fields = ["id", "applied", "created_at"]


class ProjectAttendanceSettingsSerializer(serializers.ModelSerializer):
    weekly_off_list = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = ProjectAttendanceSettings
        fields = [
            "id", "project",
            "shift_start", "shift_end", "break_minutes", "working_hours_per_day",
            "auto_overtime",
            "weekly_off_days", "weekly_off_list", "auto_mark_weekend_off",
            "auto_apply_holiday",
            "annual_leave_days", "sick_leave_days", "leave_carry_forward",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_weekly_off_list(self, obj):
        return obj.weekly_off_list
