"""
apps.worker.serializers
~~~~~~~~~~~~~~~~~~~~~~~
Serializers used by the Worker Portal API.
All read-only worker-safe views — costs/rates are intentionally omitted
where workers should not see financial data.
"""
from rest_framework import serializers
from apps.tasks.models import Task, TaskMedia, TaskUpdate
from apps.core.models import ConstructionPhase, Room
from apps.resource.models import Material, Equipment


# ─────────────────────────────────────────────────────────────────────────────
#  Phase (read-only, worker-safe)
# ─────────────────────────────────────────────────────────────────────────────

class WorkerPhaseSerializer(serializers.ModelSerializer):
    task_count       = serializers.SerializerMethodField()
    completed_count  = serializers.SerializerMethodField()
    progress_pct     = serializers.SerializerMethodField()

    class Meta:
        model  = ConstructionPhase
        fields = [
            "id", "name", "status",
            "start_date", "end_date",
            "task_count", "completed_count", "progress_pct",
        ]

    def get_task_count(self, obj):
        return obj.tasks.count()

    def get_completed_count(self, obj):
        return obj.tasks.filter(status="COMPLETED").count()

    def get_progress_pct(self, obj):
        total = obj.tasks.count()
        if not total:
            return 0
        done = obj.tasks.filter(status="COMPLETED").count()
        return round(done / total * 100)


# ─────────────────────────────────────────────────────────────────────────────
#  Task
# ─────────────────────────────────────────────────────────────────────────────

class WorkerTaskMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model  = TaskMedia
        fields = ["id", "media_type", "url", "description", "created_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class WorkerTaskSerializer(serializers.ModelSerializer):
    phase_name       = serializers.CharField(source="phase.name",            read_only=True)
    phase_status     = serializers.CharField(source="phase.status",          read_only=True)
    room_name        = serializers.CharField(source="room.name",             read_only=True, default=None)
    assigned_to_name = serializers.SerializerMethodField()
    media            = WorkerTaskMediaSerializer(many=True, read_only=True)

    class Meta:
        model  = Task
        fields = [
            "id", "title", "description", "technical_requirement",
            "status", "priority",
            "start_date", "due_date", "completed_date",
            "phase", "phase_name", "phase_status",
            "room",  "room_name",
            "assigned_to", "assigned_to_name",
            "media",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "title", "description", "technical_requirement",
            "priority", "start_date", "due_date",
            "phase", "phase_name", "phase_status", "room", "room_name",
            "assigned_to", "assigned_to_name",
            "media", "created_at", "updated_at",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return obj.assigned_to.full_name
        return None


class WorkerTaskUpdateSerializer(serializers.Serializer):
    """Validates a worker's status patch on their own task."""
    ALLOWED = {"IN_PROGRESS", "COMPLETED", "BLOCKED"}

    status         = serializers.ChoiceField(choices=list(ALLOWED))
    blocker_reason = serializers.CharField(required=False, allow_blank=True, max_length=500)
    progress_note  = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if data.get("status") == "BLOCKED" and not data.get("blocker_reason", "").strip():
            raise serializers.ValidationError(
                {"blocker_reason": "A reason is required when marking a task as BLOCKED."}
            )
        return data


# ─────────────────────────────────────────────────────────────────────────────
#  Photo upload
# ─────────────────────────────────────────────────────────────────────────────

class WorkerPhotoUploadSerializer(serializers.Serializer):
    task_id     = serializers.IntegerField(required=False, allow_null=True)
    file        = serializers.ImageField()
    description = serializers.CharField(required=False, allow_blank=True, max_length=500)


class WorkerPhotoSerializer(serializers.ModelSerializer):
    url        = serializers.SerializerMethodField()
    task_name  = serializers.SerializerMethodField()
    phase_name = serializers.SerializerMethodField()

    class Meta:
        model  = TaskMedia
        fields = ["id", "task", "task_name", "phase_name", "media_type", "url", "description", "created_at"]

    def get_url(self, obj):
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def get_task_name(self, obj):
        if obj.task:
            return obj.task.title
        return "General / Untagged"

    def get_phase_name(self, obj):
        try:
            return obj.task.phase.name if obj.task else "General"
        except Exception:
            return None


# ─────────────────────────────────────────────────────────────────────────────
#  Resources (material + equipment — no cost/price fields exposed)
# ─────────────────────────────────────────────────────────────────────────────

class WorkerMaterialSerializer(serializers.ModelSerializer):
    low_stock = serializers.SerializerMethodField()

    class Meta:
        model  = Material
        fields = [
            "id", "name", "category", "unit",
            "stock_qty", "reorder_level", "low_stock",
            "description",
        ]
        # unit_price intentionally excluded

    def get_low_stock(self, obj):
        return obj.stock_qty <= obj.reorder_level


class WorkerEquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Equipment
        fields = [
            "id", "name", "equipment_type", "status",
            "quantity", "description",
        ]
        # daily_rate intentionally excluded


# ─────────────────────────────────────────────────────────────────────────────
#  Material Request
# ─────────────────────────────────────────────────────────────────────────────

class MaterialRequestSerializer(serializers.Serializer):
    material_id = serializers.UUIDField()
    quantity    = serializers.DecimalField(max_digits=15, decimal_places=3, min_value=0.001)
    notes       = serializers.CharField(required=False, allow_blank=True, max_length=500)
