from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from decimal import Decimal

from .models import Task, TaskUpdate, TaskMedia
from .serializers import TaskSerializer, TaskUpdateSerializer, TaskMediaSerializer
from apps.accounts.permissions import CanManagePhases


class TaskViewSet(viewsets.ModelViewSet):
    # Required by DRF router for basename auto-detection.
    # Actual filtering is done in get_queryset() below.
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]

    def get_queryset(self):
        qs = Task.objects.select_related('phase', 'phase__project', 'room', 'assigned_to', 'category')
        phase_id = self.request.query_params.get('phase')
        project_id = self.request.query_params.get('project')
        if phase_id:
            qs = qs.filter(phase_id=phase_id)
        if project_id:
            qs = qs.filter(phase__project_id=project_id)
        return qs.order_by('phase__order', 'id')

    @action(detail=False, methods=['post'], url_path='recalculate_budgets')
    def recalculate_budgets(self, request):
        """
        Manually recalculate all ConstructionPhase.estimated_budget and
        PhaseBudgetLine.budgeted_amount values from current task sums.

        POST /tasks/recalculate_budgets/
        Optional body: { "project_id": 4 }
        """
        from apps.core.models import ConstructionPhase
        from apps.accounting.models.budget import PhaseBudgetLine

        project_id = request.data.get('project_id') or request.query_params.get('project')

        phases_qs = ConstructionPhase.objects.all()
        if project_id:
            phases_qs = phases_qs.filter(project_id=project_id)

        updated_phases = []
        updated_pbls = []

        for phase in phases_qs:
            task_total = (
                Task.objects.filter(phase=phase)
                .aggregate(t=Sum('estimated_cost'))['t']
                or Decimal('0.00')
            )

            if phase.estimated_budget != task_total:
                phase.estimated_budget = task_total
                phase.save(update_fields=['estimated_budget'])
                updated_phases.append(phase.name)

            # Mirror into PhaseBudgetLine
            pbl = PhaseBudgetLine.objects.filter(phase=phase).first()
            if pbl and pbl.budgeted_amount != task_total:
                pbl.budgeted_amount = task_total
                pbl.save(update_fields=['budgeted_amount'])
                updated_pbls.append(phase.name)

        return Response({
            'status': 'ok',
            'updated_phases': updated_phases,
            'updated_phase_budget_lines': updated_pbls,
            'message': (
                f'Recalculated {len(updated_phases)} phase budgets and '
                f'{len(updated_pbls)} PhaseBudgetLines.'
            ),
        }, status=status.HTTP_200_OK)


class TaskUpdateViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]

    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset


class TaskMediaViewSet(viewsets.ModelViewSet):
    queryset = TaskMedia.objects.all()
    serializer_class = TaskMediaSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]

    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
