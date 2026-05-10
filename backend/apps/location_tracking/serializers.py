from rest_framework import serializers
from .models import ProjectGeofence, StaffLocationLog, StaffPresenceSession, ProjectSitePin


class ProjectSitePinSerializer(serializers.ModelSerializer):
    pin_type_label = serializers.CharField(source='get_pin_type_display', read_only=True)

    class Meta:
        model  = ProjectSitePin
        fields = [
            'id', 'project', 'name', 'pin_type', 'pin_type_label',
            'latitude', 'longitude', 'notes', 'color', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'pin_type_label', 'created_at', 'updated_at']


class ProjectGeofenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectGeofence
        fields = [
            'id', 'project', 'name', 'latitude', 'longitude',
            'radius_meters', 'fence_color', 'is_active', 'updated_at',
        ]
        read_only_fields = ['id', 'updated_at']


class StaffLocationLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True, default=None)
    geofence_name = serializers.CharField(source='geofence.name', read_only=True, default=None)

    class Meta:
        model = StaffLocationLog
        fields = [
            'id', 'user', 'username', 'full_name',
            'latitude', 'longitude', 'accuracy', 'speed', 'heading',
            'timestamp', 'is_on_site',
            'project', 'project_name',
            'geofence', 'geofence_name',
        ]
        read_only_fields = [
            'id', 'user', 'username', 'full_name', 'timestamp',
            'is_on_site', 'project', 'project_name', 'geofence', 'geofence_name',
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username


class StaffPresenceSessionSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    full_name = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = StaffPresenceSession
        fields = [
            'id', 'user', 'username', 'full_name', 'avatar_url',
            'project', 'project_name',
            'entry_at', 'exit_at', 'duration_minutes',
            'last_known_lat', 'last_known_lon', 'last_ping_at',
            'is_active',
        ]
        read_only_fields = [
            'id', 'user', 'username', 'full_name', 'avatar_url',
            'project', 'project_name',
            'entry_at', 'exit_at', 'duration_minutes',
            'last_known_lat', 'last_known_lon', 'last_ping_at',
            'is_active',
        ]

    def get_full_name(self, obj):
        name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return name or obj.user.username

    def get_avatar_url(self, obj):
        name = self.get_full_name(obj)
        return f"https://ui-avatars.com/api/?name={name.replace(' ', '+')}&background=random&size=80"
