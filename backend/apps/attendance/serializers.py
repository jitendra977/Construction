from rest_framework import serializers
from .models import AttendanceWorker, DailyAttendance


class AttendanceWorkerSerializer(serializers.ModelSerializer):
    trade_display       = serializers.CharField(source="get_trade_display", read_only=True)
    worker_type_display = serializers.CharField(source="get_worker_type_display", read_only=True)
    effective_ot_rate   = serializers.DecimalField(
        source="effective_overtime_rate", max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model  = AttendanceWorker
        fields = [
            "id", "project", "name", "trade", "trade_display",
            "worker_type", "worker_type_display",
            "daily_rate", "overtime_rate_per_hour", "effective_ot_rate",
            "phone", "address", "linked_user",
            "is_active", "joined_date", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


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
        read_only_fields = [
            "daily_rate_snapshot", "overtime_rate_snapshot",
            "created_at", "updated_at",
        ]


class BulkAttendanceSerializer(serializers.Serializer):
    """For marking multiple workers' attendance for a single date."""
    project = serializers.IntegerField()
    date    = serializers.DateField()
    records = serializers.ListField(
        child=serializers.DictField(),
        help_text="[{worker: id, status: 'PRESENT', overtime_hours: 0, notes: ''}]"
    )
