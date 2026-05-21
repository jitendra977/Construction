from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from apps.financials.models.expense import Expense
from apps.financials.serializers.expense import ExpenseSerializer
from apps.core.mixins import ProjectScopedMixin


class ExpenseViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for quick expenses at /api/v1/fin/expenses/.

    Replaces apps.finance.Expense for all new code.
    Supports ?project=<id> and ?phase=<id> filters.
    """
    queryset         = Expense.objects.select_related("phase", "project").order_by("-date", "-created_at")
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends  = [DjangoFilterBackend]
    filterset_fields = ["project", "phase", "expense_type", "is_paid"]
    project_field    = "project"
