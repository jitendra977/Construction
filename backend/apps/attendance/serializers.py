from rest_framework import serializers
from .models import AttendanceWorker, DailyAttendance, QRScanLog


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

    class Meta:
        model  = AttendanceWorker
        fields = [
            "id", "project", "name", "trade", "trade_display",
            "worker_type", "worker_type_display",
            "daily_rate", "overtime_rate_per_hour", "effective_ot_rate",
            "phone", "address", "linked_user", "project_member",
            "member_role", "member_user_name", "member_user_email", "member_user_avatar",
            "is_active", "joined_date", "notes",
            "qr_token",
            "created_at", "updated_at",
        ]
        read_only_fields = ["qr_token", "created_at", "updated_at"]

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
    worker_name   = serializers.CharField(source="worker.name", read_only=True)
    scanned_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = QRScanLog
        fields = [
            "id", "worker", "worker_name", "attendance",
            "scan_type", "scanned_at",
            "scanned_by", "scanned_by_name",
            "ip_address", "note",
        ]

    def get_scanned_by_name(self, obj):
        if obj.scanned_by:
            return obj.scanned_by.get_full_name() or obj.scanned_by.username
        return "Kiosk / Anonymous"
