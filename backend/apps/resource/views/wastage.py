from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.core.mixins import ProjectScopedMixin
from ..models.wastage import WastageAlert, WastageThreshold
from ..serializers.wastage import WastageAlertSerializer, WastageThresholdSerializer


class WastageThresholdViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    CRUD for per-material wastage thresholds.
    GET    /api/v1/wastage-thresholds/       — list all
    POST   /api/v1/wastage-thresholds/       — create
    PATCH  /api/v1/wastage-thresholds/{id}/  — update
    DELETE /api/v1/wastage-thresholds/{id}/  — delete
    """
    permission_classes = [IsAuthenticated]
    queryset           = WastageThreshold.objects.select_related('material').order_by('material__name')
    serializer_class   = WastageThresholdSerializer
    http_method_names  = ['get', 'post', 'patch', 'delete', 'head', 'options']
    project_field      = 'material__project'

    def get_queryset(self):
        return super().get_queryset()


class WastageAlertViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    """
    GET   /api/v1/wastage-alerts/            — list open alerts
    GET   /api/v1/wastage-alerts/dashboard/  — aggregated wastage stats
    PATCH /api/v1/wastage-alerts/{id}/resolve/ — mark alert as resolved
    """
    permission_classes = [IsAuthenticated]
    queryset           = WastageAlert.objects.select_related(
                             'material', 'threshold', 'transaction'
                         ).order_by('-created_at')
    serializer_class   = WastageAlertSerializer
    filter_backends    = [DjangoFilterBackend]
    filterset_fields   = ['severity', 'is_resolved', 'material']
    http_method_names  = ['get', 'patch', 'head', 'options']
    project_field      = 'material__project'

    def get_queryset(self):
        return super().get_queryset()

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        qs = self.get_queryset()
        return Response({
            'total':     qs.count(),
            'open':      qs.filter(is_resolved=False).count(),
            'critical':  qs.filter(severity='CRITICAL', is_resolved=False).count(),
            'warning':   qs.filter(severity='WARNING',  is_resolved=False).count(),
            'resolved':  qs.filter(is_resolved=True).count(),
        })

    @action(detail=True, methods=['patch'])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved   = True
        alert.resolved_note = request.data.get('resolved_note', '')
        alert.save()
        return Response(WastageAlertSerializer(alert).data)
