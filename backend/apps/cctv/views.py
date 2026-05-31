from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import viewsets

from apps.core.mixins import ProjectScopedMixin

from .models import Camera
from .serializers import CameraSerializer


class CameraViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = CameraSerializer
    queryset = Camera.objects.select_related('project').all()
    project_field = 'project'

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        active = self.request.query_params.get('active')
        if active in ('true', 'false'):
            qs = qs.filter(is_active=(active == 'true'))
        return qs


class CameraHealthView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Camera.objects.all()
        if not getattr(request.user, 'is_system_admin', False):
            from apps.core.models import ProjectMember
            project_ids = ProjectMember.objects.filter(user=request.user).values_list('project_id', flat=True)
            qs = qs.filter(project_id__in=project_ids)
        return Response({'ok': True, 'camera_count': qs.count()})
