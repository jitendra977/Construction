from rest_framework import serializers
from ..models.budget import BudgetCategory, BudgetAllocation


class BudgetAllocationSerializer(serializers.ModelSerializer):
    phase_name = serializers.CharField(source="phase.name", read_only=True)

    class Meta:
        model  = BudgetAllocation
        fields = ["id", "category", "phase", "phase_name", "allocated_amount", "notes",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BudgetCategorySerializer(serializers.ModelSerializer):
    allocations     = BudgetAllocationSerializer(source="fin_allocations", many=True, read_only=True)
    gl_account_name = serializers.CharField(source="gl_account.name", read_only=True)

    class Meta:
        model  = BudgetCategory
        fields = [
            "id", "name", "description", "project",
            "gl_account", "gl_account_name",
            "allocations", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "allocations", "created_at", "updated_at"]
