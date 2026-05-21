from rest_framework import serializers
from ..models.budget import BudgetCategory, BudgetAllocation


class BudgetAllocationSerializer(serializers.ModelSerializer):
    phase_name    = serializers.CharField(source="phase.name",     read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    amount        = serializers.DecimalField(source="allocated_amount", max_digits=15, decimal_places=2)

    class Meta:
        model  = BudgetAllocation
        fields = ["id", "category", "category_name", "phase", "phase_name", "amount", "notes",
                  "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BudgetCategorySerializer(serializers.ModelSerializer):
    phase_allocations = BudgetAllocationSerializer(source="fin_allocations", many=True, read_only=True)
    allocations       = BudgetAllocationSerializer(source="fin_allocations", many=True, read_only=True)
    gl_account_name   = serializers.CharField(source="gl_account.name", read_only=True)
    allocation        = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    total_spent       = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)
    remaining_budget  = serializers.DecimalField(max_digits=15, decimal_places=2, read_only=True)

    class Meta:
        model  = BudgetCategory
        fields = [
            "id", "name", "description", "project",
            "gl_account", "gl_account_name",
            "phase_allocations", "allocations",
            "allocation", "total_spent", "remaining_budget",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "phase_allocations", "allocations",
            "allocation", "total_spent", "remaining_budget",
            "created_at", "updated_at"
        ]

