from rest_framework import viewsets

from ..models.supplier import Supplier
from ..serializers.supplier import SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    serializer_class = SupplierSerializer

    def get_queryset(self):
        qs  = Supplier.objects.all().order_by("name")
        pid = self.request.query_params.get("project")
        if pid:
            qs = qs.filter(project_id=pid)
        return qs
