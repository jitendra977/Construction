from rest_framework import serializers
from ..models.labor import Worker, WorkerAttendance


class WorkerSerializer(serializers.ModelSerializer):
    total_days_worked = serializers.IntegerField(read_only=True)
    total_earnings    = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model  = Worker
        fields = [
            "id", "project", "name", "role", "daily_wage",
            "phone", "address", "is_active", "joined_date",
            "total_days_worked", "total_earnings",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "total_days_worked", "total_earnings", "created_at", "updated_at"]


class WorkerAttendanceSerializer(serializers.ModelSerializer):

    class Meta:
        model  = WorkerAttendance
        fields = [
            "id", "worker", "date", "is_present", "overtime_hours", "notes",
        ]
        read_only_fields = ["id"]
