from rest_framework import serializers
from ..models.phase_budget import PhaseBudgetLine, BudgetRevision


class BudgetRevisionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model  = BudgetRevision
        fields = [
            "id", "budget_line", "date",
            "previous_amount", "new_amount", "reason",
            "created_by", "created_by_name",
        ]
        read_only_fields = ["id", "date", "created_by"]


class PhaseBudgetLineSerializer(serializers.ModelSerializer):
    phase_name    = serializers.CharField(source="phase.name",    read_only=True)
    project_name  = serializers.CharField(source="project.name", read_only=True)
    revisions     = BudgetRevisionSerializer(many=True, read_only=True)

    class Meta:
        model  = PhaseBudgetLine
        fields = [
            "id", "project", "project_name", "phase", "phase_name",
            "budgeted_amount", "revisions", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
