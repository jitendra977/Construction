"""
PhaseBudgetLineViewSet & BudgetRevisionViewSet

Endpoints
─────────
GET/POST        /financials/phase-budgets/
GET/PATCH/DEL   /financials/phase-budgets/{id}/
GET             /financials/phase-budgets/variance/

GET             /financials/budget-revisions/?budget_line={id}
"""
from decimal import Decimal
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models.phase_budget import PhaseBudgetLine, BudgetRevision
from ..serializers.phase_budget import PhaseBudgetLineSerializer, BudgetRevisionSerializer


class PhaseBudgetLineViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = PhaseBudgetLineSerializer

    def get_queryset(self):
        qs = PhaseBudgetLine.objects.select_related("project", "phase").prefetch_related("revisions")
        project = self.request.query_params.get("project")
        if project:
            qs = qs.filter(project_id=project)
        return qs

    def perform_update(self, serializer):
        """Track budget revisions on amount change."""
        instance = self.get_object()
        new_amount = serializer.validated_data.get("budgeted_amount")
        if new_amount is not None and new_amount != instance.budgeted_amount:
            BudgetRevision.objects.create(
                budget_line=instance,
                previous_amount=instance.budgeted_amount,
                new_amount=new_amount,
                reason=self.request.data.get("reason", "Updated via API"),
                created_by=self.request.user,
            )
        serializer.save()

    @action(detail=False, methods=["get"])
    def variance(self, request):
        """Return budget vs actual spent per phase."""
        project = request.query_params.get("project")
        qs = self.get_queryset()
        if project:
            qs = qs.filter(project_id=project)

        result = []
        for bl in qs:
            from ..models.expense import Expense
            actual = Expense.objects.filter(
                project_id=bl.project_id, phase_id=bl.phase_id
            ).aggregate(total=__import__('django').db.models.Sum("amount"))["total"] or Decimal("0")
            result.append({
                "phase_id":         str(bl.phase_id),
                "phase_name":       bl.phase.name,
                "budgeted_amount":  float(bl.budgeted_amount),
                "actual_spent":     float(actual),
                "variance":         float(bl.budgeted_amount - actual),
            })
        return Response(result)


class BudgetRevisionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class   = BudgetRevisionSerializer

    def get_queryset(self):
        qs = BudgetRevision.objects.select_related("budget_line", "created_by").order_by("-date")
        budget_line = self.request.query_params.get("budget_line")
        if budget_line:
            qs = qs.filter(budget_line_id=budget_line)
        return qs
