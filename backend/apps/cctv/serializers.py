from rest_framework import serializers

from .models import Camera


class CameraSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source='project.name', read_only=True)

    class Meta:
        model = Camera
        fields = [
            'id',
            'project',
            'project_name',
            'name',
            'stream_url',
            'snapshot_url',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'project_name']
