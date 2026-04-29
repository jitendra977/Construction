from rest_framework import serializers
from ..models import Team, WorkforceMember


class TeamMemberSerializer(serializers.ModelSerializer):
    """Slim WorkforceMember representation used inside team responses."""
    full_name      = serializers.ReadOnlyField()
    effective_trade = serializers.ReadOnlyField()

    class Meta:
        model  = WorkforceMember
        fields = [
            'id', 'employee_id', 'full_name',
            'effective_trade', 'worker_type', 'status',
        ]


class TeamSerializer(serializers.ModelSerializer):
    members_detail = TeamMemberSerializer(source='members', many=True, read_only=True)
    member_count   = serializers.IntegerField(read_only=True)
    leader_name    = serializers.ReadOnlyField(source='leader.full_name')

    class Meta:
        model  = Team
        fields = [
            'id', 'project', 'name', 'description',
            'leader', 'leader_name',
            'members', 'members_detail', 'member_count',
            'is_active', 'created_at', 'updated_at',
        ]
        extra_kwargs = {
            'members': {'write_only': True},
        }
