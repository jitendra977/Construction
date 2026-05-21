from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
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
        qs = qs.prefetch_related(
            "fin_allocations__phase",
            "fin_expenses",
            "fin_bill_items",
            "finance_expenses",
        ).order_by("sequence", "name")
        pid = self.request.query_params.get("project")
        if pid and str(pid) not in ("", "null", "undefined"):
            try:
                qs = qs.filter(project_id=int(pid))
            except (ValueError, TypeError):
                pass
        return qs

    @action(detail=False, methods=['patch'])
    def reorder(self, request):
        """
        Accepts {"ordered_ids": ["uuid-1", "uuid-2", ...]}
        and updates the 'sequence' field matching the array index.
        """
        ordered_ids = request.data.get('ordered_ids', [])
        if not isinstance(ordered_ids, list):
            return Response({"detail": "ordered_ids must be a list"}, status=status.HTTP_400_BAD_REQUEST)
        
        # We only update items in the current user's project scope
        qs = self.get_queryset().filter(id__in=ordered_ids)
        category_map = {str(cat.id): cat for cat in qs}
        
        updated_cats = []
        for index, cat_id in enumerate(ordered_ids):
            if cat_id in category_map:
                cat = category_map[cat_id]
                cat.sequence = index
                updated_cats.append(cat)
                
        if updated_cats:
            BudgetCategory.objects.bulk_update(updated_cats, ['sequence'])
            
        return Response({"detail": "Order updated successfully"})



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

