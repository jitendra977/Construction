from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WorkerAssignment, WorkerEvaluation, SafetyRecord, PerformanceLog, EmergencyContact
from ..serializers import (
    WorkerAssignmentSerializer, WorkerEvaluationSerializer, 
    SafetyRecordSerializer, PerformanceLogSerializer, EmergencyContactSerializer
)

class WorkerAssignmentViewSet(viewsets.ModelViewSet):
    queryset = WorkerAssignment.objects.select_related('worker', 'project', 'phase', 'task').all()
    serializer_class = WorkerAssignmentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'phase', 'status']
    ordering_fields = ['start_date', 'end_date']

    def _sync_task_assignment(self, assignment):
        """
        After any WorkerAssignment create/update/delete that references a Task,
        recalculate how the task is assigned:

          • 0 workers  → clear both assigned_to and assigned_team
          • 1 worker   → set assigned_to = that worker, clear assigned_team
                         (delete the auto-team if one was created for this task)
          • 2+ workers → create / update an auto-Team, set assigned_team,
                         clear assigned_to

        Auto-teams are identified by name prefix "Task-<pk>:" so they can be
        updated or deleted cleanly without touching manually created teams.
        """
        if not assignment.task_id:
            return

        from apps.tasks.models import Task
        from apps.workforce.models import WorkerAssignment, WorkforceMember, Team

        task = Task.objects.select_related('phase__project').get(pk=assignment.task_id)

        # Distinct workers currently assigned to this task
        worker_ids = list(
            WorkerAssignment.objects
            .filter(task=task)
            .values_list('worker_id', flat=True)
            .distinct()
        )

        if len(worker_ids) == 0:
            # ── No workers: clear everything ────────────────────────────────
            self._delete_auto_team(task)
            Task.objects.filter(pk=task.pk).update(
                assigned_to=None, assigned_team=None
            )

        elif len(worker_ids) == 1:
            # ── Single worker: individual assignment ─────────────────────────
            self._delete_auto_team(task)
            Task.objects.filter(pk=task.pk).update(
                assigned_to_id=worker_ids[0], assigned_team=None
            )

        else:
            # ── Multiple workers: create / refresh auto-team ─────────────────
            project  = task.phase.project
            workers  = WorkforceMember.objects.filter(pk__in=worker_ids)
            team_name = f'Task-{task.pk}: {task.title[:50]}'

            team, _ = Team.objects.get_or_create(
                project=project,
                name=team_name,
                defaults={'description': f'auto:task:{task.pk}'},
            )
            team.members.set(workers)
            if not team.leader_id:
                team.leader = workers.first()
                team.save(update_fields=['leader'])

            Task.objects.filter(pk=task.pk).update(
                assigned_team=team, assigned_to=None
            )

    @staticmethod
    def _delete_auto_team(task):
        """Delete the auto-created team for a task if it exists."""
        from apps.workforce.models import Team
        if task.assigned_team_id:
            try:
                team = task.assigned_team
                if team.description.startswith('auto:task:'):
                    team.delete()
            except Exception:
                pass

    def perform_create(self, serializer):
        """
        Create the assignment, then:
        1. Auto-link the worker to the project via current_project (if not set).
        2. Sync Task.assigned_to so Phase Workforce tab ↔ Task Detail are consistent.
        """
        assignment = serializer.save(assigned_by=self.request.user)
        worker = assignment.worker
        if not worker.current_project_id:
            worker.current_project = assignment.project
            worker.save(update_fields=['current_project'])
        self._sync_task_assignment(assignment)

    def perform_update(self, serializer):
        """On update recalculate individual vs team assignment."""
        assignment = serializer.save()
        self._sync_task_assignment(assignment)

    def perform_destroy(self, instance):
        """
        When a WorkerAssignment is deleted, re-evaluate the remaining workers
        for that task so the task flips back to individual or unassigned.
        """
        task_id = instance.task_id
        instance.delete()
        if task_id:
            # Re-run sync with a minimal stub pointing at the task
            class _Stub:
                pass
            stub = _Stub()
            stub.task_id = task_id
            self._sync_task_assignment(stub)

class WorkerEvaluationViewSet(viewsets.ModelViewSet):
    queryset = WorkerEvaluation.objects.all()
    serializer_class = WorkerEvaluationSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'evaluator', 'project']
    ordering_fields = ['eval_date']

class SafetyRecordViewSet(viewsets.ModelViewSet):
    queryset = SafetyRecord.objects.all()
    serializer_class = SafetyRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'incident_type', 'severity', 'status']
    search_fields = ['description', 'location']
    ordering_fields = ['incident_date', 'severity']

class PerformanceLogViewSet(viewsets.ModelViewSet):
    queryset = PerformanceLog.objects.all()
    serializer_class = PerformanceLogSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['worker', 'project', 'category', 'rating']
    ordering_fields = ['log_date', 'rating']

class EmergencyContactViewSet(viewsets.ModelViewSet):
    queryset = EmergencyContact.objects.all()
    serializer_class = EmergencyContactSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['worker', 'is_primary']
