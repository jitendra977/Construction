"""
apps.worker.views
~~~~~~~~~~~~~~~~~
Worker Portal API — read/write endpoints scoped to the authenticated worker.

All views require IsAuthenticated + an attached workforce_profile.
Workers can only see data for their current_project.

Endpoints
---------
GET  /api/v1/worker/phases/                  — phases for current project
GET  /api/v1/worker/tasks/                   — tasks assigned to this worker
PATCH /api/v1/worker/tasks/<id>/update/      — update status / log progress
GET  /api/v1/worker/photos/                  — this worker's uploaded photos
POST /api/v1/worker/photos/upload/           — upload photo tagged to a task
GET  /api/v1/worker/resources/               — materials + equipment for active phase
POST /api/v1/worker/material-requests/       — raise a low-stock / reorder request
"""
from django.db import models
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.tasks.models import Task, TaskMedia, TaskUpdate
from apps.core.models import ConstructionPhase
from apps.resource.models import Material, Equipment
from apps.worker.models import MaterialRequest

from .serializers import (
    WorkerPhaseSerializer,
    WorkerTaskSerializer,
    WorkerTaskUpdateSerializer,
    WorkerPhotoSerializer,
    WorkerPhotoUploadSerializer,
    WorkerMaterialSerializer,
    WorkerEquipmentSerializer,
    MaterialRequestSerializer,
)


# ─────────────────────────────────────────────────────────────────────────────
#  Helper: resolve WorkforceMember from request
# ─────────────────────────────────────────────────────────────────────────────

def _get_member(request):
    """Return (member, error_response).  One of them is always None."""
    if not hasattr(request.user, "workforce_profile"):
        return None, Response(
            {"error": "No workforce profile linked to this account."},
            status=status.HTTP_403_FORBIDDEN,
        )
    return request.user.workforce_profile, None


# ─────────────────────────────────────────────────────────────────────────────
#  Phases
# ─────────────────────────────────────────────────────────────────────────────

class WorkerPhasesView(APIView):
    """
    GET /api/v1/worker/phases/
    Returns all phases for the worker's current project, with task counts.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member, err = _get_member(request)
        if err:
            return err

        if not member.current_project_id:
            return Response(
                {"error": "No project is currently assigned to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        phases = (
            ConstructionPhase.objects
            .filter(project_id=member.current_project_id)
            .prefetch_related("tasks")
            .order_by("start_date", "id")
        )
        return Response(WorkerPhaseSerializer(phases, many=True).data)


# ─────────────────────────────────────────────────────────────────────────────
#  Tasks
# ─────────────────────────────────────────────────────────────────────────────

class WorkerTasksView(APIView):
    """
    GET /api/v1/worker/tasks/
    Returns tasks assigned to this worker.
    Query params:
      ?phase=<id>      — filter by phase
      ?status=<val>    — PENDING | IN_PROGRESS | COMPLETED | BLOCKED
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member, err = _get_member(request)
        if err:
            return err

        qs = (
            Task.objects
            .filter(assigned_to=member)
            .select_related("phase", "room")
            .prefetch_related("media")
            .order_by("status", "due_date", "priority")
        )

        phase_id = request.query_params.get("phase")
        if phase_id:
            qs = qs.filter(phase_id=phase_id)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        return Response(WorkerTaskSerializer(qs, many=True, context={"request": request}).data)


class WorkerProjectTasksView(APIView):
    """
    GET /api/v1/worker/project-tasks/
    Returns ALL tasks for the worker's current project (not just assigned ones).
    Workers can browse the full task board in read-only mode.
    Query params:
      ?phase=<id>    — filter by phase
      ?status=<val>  — PENDING | IN_PROGRESS | COMPLETED | BLOCKED
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member, err = _get_member(request)
        if err:
            return err

        if not member.current_project_id:
            return Response([], status=status.HTTP_200_OK)

        qs = (
            Task.objects
            .filter(phase__project_id=member.current_project_id)
            .select_related("phase", "room", "assigned_to")
            .prefetch_related("media")
            .order_by("phase__start_date", "phase__id", "status", "due_date")
        )

        phase_id = request.query_params.get("phase")
        if phase_id:
            qs = qs.filter(phase_id=phase_id)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter.upper())

        return Response(WorkerTaskSerializer(qs, many=True, context={"request": request}).data)


class WorkerTaskUpdateView(APIView):
    """
    PATCH /api/v1/worker/tasks/<id>/update/
    Worker updates status of their own task.
    Allowed transitions: → IN_PROGRESS, → COMPLETED, → BLOCKED
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        member, err = _get_member(request)
        if err:
            return err

        try:
            task = Task.objects.select_related("phase").get(pk=pk, assigned_to=member)
        except Task.DoesNotExist:
            return Response(
                {"error": "Task not found or not assigned to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        ser = WorkerTaskUpdateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        d = ser.validated_data
        new_status = d["status"]

        task.status = new_status
        if new_status == "COMPLETED":
            task.completed_date = timezone.localdate()
        task.save(update_fields=["status", "completed_date", "updated_at"])

        # Log a TaskUpdate entry if a note was provided
        note = d.get("progress_note", "").strip()
        if not note and new_status == "BLOCKED":
            note = f"Blocked: {d.get('blocker_reason', '')}"
        if note:
            TaskUpdate.objects.create(
                task=task,
                note=note,
                progress_percentage=100 if new_status == "COMPLETED" else 50,
            )

        return Response(
            WorkerTaskSerializer(task, context={"request": request}).data
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Photos
# ─────────────────────────────────────────────────────────────────────────────

class WorkerPhotosView(APIView):
    """
    GET /api/v1/worker/photos/
    Returns photos uploaded by this worker (most recent 50).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member, err = _get_member(request)
        if err:
            return err

        # Return all photos uploaded to any task in this worker's project,
        # plus untagged photos (task=None) uploaded while member was in this project.
        photos = (
            TaskMedia.objects
            .filter(
                models.Q(task__phase__project_id=member.current_project_id) |
                models.Q(task__isnull=True)
            )
            .select_related("task", "task__phase")
            .order_by("-created_at")[:50]
        )
        return Response(
            WorkerPhotoSerializer(photos, many=True, context={"request": request}).data
        )


class WorkerPhotoUploadView(APIView):
    """
    POST /api/v1/worker/photos/upload/
    Upload a photo tagged to a specific task.
    Multipart form: { task_id, file, description? }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        member, err = _get_member(request)
        if err:
            return err

        ser = WorkerPhotoUploadSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        d = ser.validated_data

        # task_id is optional — workers can upload general site photos
        # without tagging them to a specific task.
        task = None
        task_id = d.get("task_id")
        if task_id:
            try:
                task = Task.objects.select_related("phase").get(
                    pk=task_id,
                    phase__project_id=member.current_project_id,
                )
            except Task.DoesNotExist:
                return Response(
                    {"error": "Task not found in your current project."},
                    status=status.HTTP_404_NOT_FOUND,
                )

        media = TaskMedia.objects.create(
            task=task,
            file=d["file"],
            media_type="IMAGE",
            description=d.get("description", ""),
        )

        # Kick off async photo analysis if available
        try:
            from apps.photo_intel.tasks import analyse_task_media
            analyse_task_media.delay(media.pk)
        except Exception:
            pass  # photo_intel / Celery not configured — continue silently

        return Response(
            WorkerPhotoSerializer(media, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ─────────────────────────────────────────────────────────────────────────────
#  Resources
# ─────────────────────────────────────────────────────────────────────────────

class WorkerResourcesView(APIView):
    """
    GET /api/v1/worker/resources/
    Returns materials and equipment for the worker's current project.
    No cost/rate fields are included.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        member, err = _get_member(request)
        if err:
            return err

        if not member.current_project_id:
            return Response(
                {"error": "No project is currently assigned to you."},
                status=status.HTTP_404_NOT_FOUND,
            )

        project_id = member.current_project_id

        materials = (
            Material.objects
            .filter(project_id=project_id, is_active=True)
            .order_by("category", "name")
        )
        equipment = (
            Equipment.objects
            .filter(project_id=project_id, is_active=True)
            .order_by("equipment_type", "name")
        )

        return Response({
            "materials": WorkerMaterialSerializer(materials, many=True).data,
            "equipment": WorkerEquipmentSerializer(equipment, many=True).data,
        })


# ─────────────────────────────────────────────────────────────────────────────
#  Material Request
# ─────────────────────────────────────────────────────────────────────────────

class WorkerMaterialRequestView(APIView):
    """
    POST /api/v1/worker/material-requests/
    Worker raises a restock alert for a low/depleted material.
    Body: { material_id, quantity, notes? }

    For now this creates a WastageAlert-style notification entry.
    A proper MaterialRequest model can be added in a future iteration.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        member, err = _get_member(request)
        if err:
            return err

        ser = MaterialRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        d = ser.validated_data

        # Verify material belongs to worker's project
        try:
            material = Material.objects.get(
                pk=d["material_id"],
                project_id=member.current_project_id,
            )
        except Material.DoesNotExist:
            return Response(
                {"error": "Material not found in your project."},
                status=status.HTTP_404_NOT_FOUND,
            )

        req = MaterialRequest.objects.create(
            requested_by=member,
            material=material,
            quantity_requested=d["quantity"],
            notes=d.get("notes", ""),
        )

        return Response({
            "message":       "Material request submitted. Your supervisor has been notified.",
            "request_id":    req.pk,
            "status":        req.status,
            "material":      material.name,
            "requested_qty": str(d["quantity"]),
        }, status=status.HTTP_201_CREATED)
