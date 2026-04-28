from rest_framework import serializers
from .models import Team
from apps.attendance.models import AttendanceWorker

class TeamMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceWorker
        fields = ['id', 'name', 'trade', 'worker_type', 'is_active']

class TeamSerializer(serializers.ModelSerializer):
    members_detail = TeamMemberSerializer(source='members', many=True, read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    leader_name = serializers.CharField(source='leader.name', read_only=True)

    class Meta:
        model = Team
        fields = [
            'id', 'project', 'name', 'description', 
            'leader', 'leader_name', 'members', 
            'members_detail', 'member_count', 
            'is_active', 'created_at'
        ]
        extra_kwargs = {
            'members': {'write_only': True}
        }
