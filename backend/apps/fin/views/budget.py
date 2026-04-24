from rest_framework import viewsets
from ..models.budget import BudgetCategory, BudgetAllocation
from ..serializers.budget import BudgetCategorySerializer, BudgetAllocationSerializer


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetCategorySerializer

    def get_queryset(self):
        qs  = BudgetCategory.objects.prefetch_related("fin_allocations__phase").order_by("name")
        pid = self.request.query_params.get("project")
        if pid and pid not in ("", "null"):
            try:
                qs = qs.filter(project_id=int(pid))
            except (ValueError, TypeError):
                pass
        return qs


class BudgetAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetAllocationSerializer

    def get_queryset(self):
        qs       = BudgetAllocation.objects.select_related("category", "phase").order_by("category__name")
        category = self.request.query_params.get("category")
        phase    = self.request.query_params.get("phase")
        project  = self.request.query_params.get("project")
        if category:
            qs = qs.filter(category_id=category)
        if phase:
            qs = qs.filter(phase_id=phase)
        if project:
            try:
                qs = qs.filter(category__project_id=int(project))
            except (ValueError, TypeError):
                pass
        return qs
