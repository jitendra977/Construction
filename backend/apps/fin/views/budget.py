from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from apps.core.mixins import ProjectScopedMixin
from ..models.budget import BudgetCategory, BudgetAllocation
from ..serializers.budget import BudgetCategorySerializer, BudgetAllocationSerializer


class BudgetCategoryViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetCategorySerializer
    project_field = "project"
    queryset = BudgetCategory.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.prefetch_related("fin_allocations__phase").order_by("name")
        pid = self.request.query_params.get("project")
        if pid and str(pid) not in ("", "null", "undefined"):
            try:
                qs = qs.filter(project_id=int(pid))
            except (ValueError, TypeError):
                pass
        return qs


class BudgetAllocationViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BudgetAllocationSerializer
    project_field = "category__project"
    queryset = BudgetAllocation.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        qs = qs.select_related("category", "phase").order_by("category__name")
        category = self.request.query_params.get("category")
        phase    = self.request.query_params.get("phase")
        project  = self.request.query_params.get("project")
        
        if category and str(category) not in ("", "null", "undefined"):
            qs = qs.filter(category_id=category)
        if phase and str(phase) not in ("", "null", "undefined"):
            qs = qs.filter(phase_id=phase)
        if project and str(project) not in ("", "null", "undefined"):
            try:
                qs = qs.filter(category__project_id=int(project))
            except (ValueError, TypeError):
                pass
        return qs

