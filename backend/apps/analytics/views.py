from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import BudgetAlert, BudgetForecast, SupplierRateTrend
from .serializers import (
    BudgetAlertSerializer,
    BudgetForecastSerializer,
    SupplierRateTrendSerializer,
)
from .services import compute_rate_trends, rebuild_alerts, refresh_all_forecasts
from apps.core.mixins import ProjectScopedMixin


class BudgetForecastViewSet(ProjectScopedMixin, viewsets.ReadOnlyModelViewSet):
    queryset = BudgetForecast.objects.select_related("category").all()
    serializer_class = BudgetForecastSerializer
    project_field = 'category__project'

    @action(detail=False, methods=["post"])
    def refresh(self, request):
        refresh_all_forecasts()
        rebuild_alerts()
        return Response({"status": "ok", "count": BudgetForecast.objects.count()})


class SupplierRateTrendViewSet(ProjectScopedMixin, viewsets.ReadOnlyModelViewSet):
    queryset = SupplierRateTrend.objects.select_related("supplier", "material").all()
    serializer_class = SupplierRateTrendSerializer
    project_field = 'material__project'

    @action(detail=False, methods=["post"])
    def refresh(self, request):
        compute_rate_trends()
        rebuild_alerts()
        return Response({"status": "ok", "count": SupplierRateTrend.objects.count()})


class BudgetAlertViewSet(viewsets.ModelViewSet):
    """
    CRUD partial: list/retrieve + `resolve` action. Creation/update is done
    by the analytics services — we only expose read + resolve to the client.
    """
    queryset = BudgetAlert.objects.all()
    serializer_class = BudgetAlertSerializer
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("severity"):
            qs = qs.filter(severity=p["severity"])
        if p.get("type"):
            qs = qs.filter(alert_type=p["type"])
        if p.get("resolved") in ("true", "false"):
            qs = qs.filter(is_resolved=(p["resolved"] == "true"))
        return qs

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_note = request.data.get("note", "resolved by user")
        alert.save(update_fields=["is_resolved", "resolved_note", "updated_at"])
        return Response(self.get_serializer(alert).data)

    @action(detail=False, methods=["post"])
    def rebuild(self, request):
        refresh_all_forecasts()
        compute_rate_trends()
        rebuild_alerts()
        return Response({"status": "ok", "count": BudgetAlert.objects.count()})
