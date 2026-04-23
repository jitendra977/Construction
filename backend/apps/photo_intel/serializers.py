from rest_framework import serializers

from .models import PhotoAnalysis, Timelapse, WeeklyDigest


class PhotoAnalysisSerializer(serializers.ModelSerializer):
    media_url = serializers.SerializerMethodField()
    task_title = serializers.CharField(source="media.task.title", read_only=True)
    task_phase_name = serializers.CharField(source="media.task.phase.name", read_only=True)
    has_mismatch_warning = serializers.BooleanField(read_only=True)

    class Meta:
        model = PhotoAnalysis
        fields = "__all__"
        read_only_fields = [
            "media", "status", "detected_phase_key", "detected_phase_label",
            "phase_confidence", "phase_match", "detected_objects", "tags",
            "quality_score", "brightness", "dominant_colors", "analyzer_name",
            "raw_response", "error_message", "created_at", "updated_at",
        ]

    def get_media_url(self, obj):
        request = self.context.get("request")
        if obj.media.file and request:
            return request.build_absolute_uri(obj.media.file.url)
        return obj.media.file.url if obj.media.file else None


class TimelapseSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    gif_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    room_name = serializers.CharField(source="room.name", read_only=True)
    floor_name = serializers.CharField(source="floor.name", read_only=True)
    phase_name = serializers.CharField(source="phase.name", read_only=True)

    class Meta:
        model = Timelapse
        fields = [
            "id", "title", "scope",
            "room", "room_name", "floor", "floor_name", "phase", "phase_name",
            "period_start", "period_end",
            "media_count", "video_file", "video_url",
            "gif_file", "gif_url", "thumbnail", "thumbnail_url",
            "duration_seconds", "status", "error_message",
            "auto_generated", "created_at", "updated_at",
        ]
        read_only_fields = [
            "media_count", "video_file", "gif_file", "thumbnail",
            "duration_seconds", "status", "error_message",
            "created_at", "updated_at",
        ]

    def _abs(self, f):
        req = self.context.get("request")
        if not f:
            return None
        return req.build_absolute_uri(f.url) if req else f.url

    def get_video_url(self, obj):
        return self._abs(obj.video_file)

    def get_gif_url(self, obj):
        return self._abs(obj.gif_file)

    def get_thumbnail_url(self, obj):
        return self._abs(obj.thumbnail)


class TimelapseCreateSerializer(serializers.Serializer):
    """
    Input for the `POST /photo-intel/timelapses/generate/` action.
    """
    scope = serializers.ChoiceField(choices=[c[0] for c in Timelapse.SCOPE_CHOICES])
    project = serializers.IntegerField(required=False, allow_null=True)
    room = serializers.IntegerField(required=False, allow_null=True)
    floor = serializers.IntegerField(required=False, allow_null=True)
    phase = serializers.IntegerField(required=False, allow_null=True)
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    title = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        scope = attrs["scope"]
        if scope == "PROJECT" and not attrs.get("project"):
            raise serializers.ValidationError("project is required for scope=PROJECT")
        if scope == "ROOM" and not attrs.get("room"):
            raise serializers.ValidationError("room is required for scope=ROOM")
        if scope == "FLOOR" and not attrs.get("floor"):
            raise serializers.ValidationError("floor is required for scope=FLOOR")
        if scope == "PHASE" and not attrs.get("phase"):
            raise serializers.ValidationError("phase is required for scope=PHASE")
        if attrs["period_end"] < attrs["period_start"]:
            raise serializers.ValidationError("period_end must be >= period_start")
        return attrs


class WeeklyDigestSerializer(serializers.ModelSerializer):
    timelapses_detail = TimelapseSerializer(source="timelapses", many=True, read_only=True)

    class Meta:
        model = WeeklyDigest
        fields = [
            "id", "week_start", "week_end", "summary", "metrics", "alerts",
            "timelapses", "timelapses_detail", "emailed", "emailed_at", "created_at",
        ]
        read_only_fields = ["created_at", "emailed_at"]
