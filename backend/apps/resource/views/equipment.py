from rest_framework import viewsets

from ..models.equipment import Equipment
from ..serializers.equipment import EquipmentSerializer


class EquipmentViewSet(viewsets.ModelViewSet):
    serializer_class = EquipmentSerializer

    def get_queryset(self):
        qs = Equipment.objects.all().order_by("name")
        pid    = self.request.query_params.get("project")
        status = self.request.query_params.get("status")
        if pid:
            qs = qs.filter(project_id=pid)
        if status:
            qs = qs.filter(status=status)
        return qs
