from rest_framework import serializers
from apps.fin.models.expense import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    phase_name   = serializers.CharField(source="phase.name",    read_only=True)
    project_name = serializers.CharField(source="project.name",  read_only=True)

    class Meta:
        model  = Expense
        fields = [
            "id", "title", "amount", "expense_type", "date",
            "paid_to", "is_paid", "notes",
            "phase", "phase_name",
            "project", "project_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
