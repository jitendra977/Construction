from rest_framework import serializers
from ..models import EmergencyContact, SafetyRecord, PerformanceLog

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['id', 'worker', 'name', 'relationship', 'phone', 'phone_alt', 'address', 'is_primary']

class SafetyRecordSerializer(serializers.ModelSerializer):
    incident_type_display = serializers.CharField(source='get_incident_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = SafetyRecord
        fields = [
            'id', 'worker', 'project', 'incident_type', 'incident_type_display',
            'severity', 'severity_display', 'status', 'status_display',
            'incident_date', 'incident_time', 'location', 'description',
            'action_taken', 'photo_1', 'photo_2'
        ]

class PerformanceLogSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    rating_display = serializers.CharField(source='get_rating_display', read_only=True)

    class Meta:
        model = PerformanceLog
        fields = ['id', 'worker', 'project', 'log_date', 'category', 'category_display', 'rating', 'rating_display', 'notes']
