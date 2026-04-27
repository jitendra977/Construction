from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from decimal import Decimal
from collections import defaultdict, deque

from .models import Task, TaskUpdate, TaskMedia
from .serializers import TaskSerializer, TaskUpdateSerializer, TaskMediaSerializer
from apps.accounts.permissions import CanManagePhases
from apps.core.mixins import ProjectScopedMixin


class TaskViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    # Required by DRF router for basename auto-detection.
    # Actual filtering is done in get_queryset() below.
    queryset = Task.objects.select_related('phase', 'phase__project', 'room', 'assigned_to', 'category')
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]
    project_field = 'phase__project'

    def get_queryset(self):
        qs = super().get_queryset()
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


    @action(detail=False, methods=['get'], url_path='critical_path')
    def critical_path(self, request):
        """
        Compute critical path for tasks in a project.
        GET /tasks/critical_path/?project=<id>

        Returns:
          - critical_path_ids: list of task IDs on the longest dependency chain
          - dependency_graph: { task_id: [blocked_by_id, ...] }
          - task_stats: { task_id: { earliest_start, earliest_finish, latest_start, latest_finish, float } }
        """
        project_id = request.query_params.get('project')
        qs = Task.objects.select_related('phase').filter(
            phase__project_id=project_id
        ) if project_id else Task.objects.select_related('phase').all()

        tasks = list(qs)
        if not tasks:
            return Response({'critical_path_ids': [], 'dependency_graph': {}, 'task_stats': {}})

        # Build adjacency: blocked_by means "I depend on that task"
        # successors[t] = list of tasks that depend on t
        task_map = {t.id: t for t in tasks}
        predecessors = defaultdict(list)   # task_id -> [dep_id, ...]
        successors   = defaultdict(list)   # dep_id -> [task_id, ...]
        in_degree     = defaultdict(int)

        for t in tasks:
            if t.blocked_by_id and t.blocked_by_id in task_map:
                predecessors[t.id].append(t.blocked_by_id)
                successors[t.blocked_by_id].append(t.id)
                in_degree[t.id] += 1

        # Duration = 1 day default; use start/due dates when available
        def duration(t):
            if t.start_date and t.due_date and t.due_date >= t.start_date:
                return (t.due_date - t.start_date).days or 1
            return 1

        # Forward pass — Earliest Start / Finish
        earliest_finish = {}
        queue = deque([t.id for t in tasks if in_degree[t.id] == 0])
        topo_order = []
        remaining_in_degree = dict(in_degree)

        while queue:
            tid = queue.popleft()
            topo_order.append(tid)
            t = task_map[tid]
            es = max((earliest_finish.get(p, 0) for p in predecessors[tid]), default=0)
            earliest_finish[tid] = es + duration(t)
            for s in successors[tid]:
                remaining_in_degree[s] -= 1
                if remaining_in_degree[s] == 0:
                    queue.append(s)

        # Handle cycles (shouldn't exist but guard anyway)
        for t in tasks:
            if t.id not in earliest_finish:
                earliest_finish[t.id] = duration(t)
                topo_order.append(t.id)

        project_duration = max(earliest_finish.values(), default=1)

        # Backward pass — Latest Finish / Start
        latest_start = {}
        latest_finish = {}
        for tid in reversed(topo_order):
            t = task_map[tid]
            lf = min((latest_start.get(s, project_duration) for s in successors[tid]), default=project_duration)
            latest_finish[tid] = lf
            latest_start[tid]  = lf - duration(t)

        # Float & critical path
        task_stats = {}
        for t in tasks:
            tid = t.id
            es  = earliest_finish.get(tid, duration(t)) - duration(t)
            ef  = earliest_finish.get(tid, duration(t))
            ls  = latest_start.get(tid, es)
            lf  = latest_finish.get(tid, ef)
            flt = ls - es
            task_stats[tid] = {
                'earliest_start':  es,
                'earliest_finish': ef,
                'latest_start':    ls,
                'latest_finish':   lf,
                'float':           flt,
                'is_critical':     flt <= 0,
                'duration':        duration(t),
            }

        critical_path_ids = [tid for tid, s in task_stats.items() if s['is_critical']]
        dep_graph = {t.id: predecessors[t.id] for t in tasks}

        return Response({
            'critical_path_ids': critical_path_ids,
            'dependency_graph':  dep_graph,
            'task_stats':        task_stats,
        })

    @action(detail=True, methods=['post'], url_path='add_update')
    def add_update(self, request, pk=None):
        """
        POST /tasks/<id>/add_update/
        Body: { note, progress_percentage }
        Creates a TaskUpdate and bumps Task.progress_percentage.
        """
        task = self.get_object()
        note = request.data.get('note', '').strip()
        pct  = request.data.get('progress_percentage', task.progress_percentage)

        try:
            pct = max(0, min(100, int(pct)))
        except (ValueError, TypeError):
            pct = task.progress_percentage

        update = TaskUpdate.objects.create(task=task, note=note, progress_percentage=pct)
        task.progress_percentage = pct
        if pct == 100 and task.status != 'COMPLETED':
            task.status = 'COMPLETED'
        task.save(update_fields=['progress_percentage', 'status'])

        return Response(TaskUpdateSerializer(update).data, status=status.HTTP_201_CREATED)


class TaskUpdateViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]
    project_field = 'task__phase__project'

    def get_queryset(self):
        qs = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs


class TaskMediaViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    queryset = TaskMedia.objects.all()
    serializer_class = TaskMediaSerializer
    permission_classes = [permissions.IsAuthenticated, CanManagePhases]
    project_field = 'task__phase__project'

    def get_queryset(self):
        qs = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            qs = qs.filter(task_id=task_id)
        return qs
