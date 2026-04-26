from .material  import MaterialViewSet
from .equipment import EquipmentViewSet
from .labor     import WorkerViewSet, WorkerAttendanceViewSet
from .supplier  import SupplierViewSet
from .purchase  import PurchaseOrderViewSet, PurchaseOrderItemViewSet, StockMovementViewSet
from .dashboard import ResourceDashboardView

__all__ = [
    "MaterialViewSet",
    "EquipmentViewSet",
    "WorkerViewSet", "WorkerAttendanceViewSet",
    "SupplierViewSet",
    "PurchaseOrderViewSet", "PurchaseOrderItemViewSet", "StockMovementViewSet",
    "ResourceDashboardView",
]
