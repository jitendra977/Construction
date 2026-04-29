from rest_framework import serializers
from ..models import Skill, WorkerSkill

class SkillSerializer(serializers.ModelSerializer):
    trade_type_display = serializers.CharField(source='get_trade_type_display', read_only=True)

    class Meta:
        model = Skill
        fields = ['id', 'name', 'trade_type', 'trade_type_display', 'description', 'is_active']

class WorkerSkillSerializer(serializers.ModelSerializer):
    skill_name = serializers.ReadOnlyField(source='skill.name')
    level_display = serializers.CharField(source='get_level_display', read_only=True)
    is_expired = serializers.ReadOnlyField()

    class Meta:
        model = WorkerSkill
        fields = [
            'id', 'worker', 'skill', 'skill_name', 'level', 'level_display',
            'years_experience', 'is_certified', 'certified_by', 'certified_date',
            'expiry_date', 'certificate_number', 'is_verified', 'is_expired', 'notes'
        ]
