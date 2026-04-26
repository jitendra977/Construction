from rest_framework import viewsets

from ..models.labor import Worker, WorkerAttendance
from ..serializers.labor import WorkerSerializer, WorkerAttendanceSerializer


class WorkerViewSet(viewsets.ModelViewSet):
    serializer_class = WorkerSerializer

    def get_queryset(self):
        qs        = Worker.objects.all().order_by("name")
        pid       = self.request.query_params.get("project")
        is_active = self.request.query_params.get("is_active")
        if pid:
            qs = qs.filter(project_id=pid)
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == "true")
        return qs


class WorkerAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkerAttendanceSerializer

    def get_queryset(self):
        qs     = WorkerAttendance.objects.all().order_by("-date")
        worker = self.request.query_params.get("worker")
        date   = self.request.query_params.get("date")
        if worker:
            qs = qs.filter(worker_id=worker)
        if date:
            qs = qs.filter(date=date)
        return qs
