"""
Resource Module — URL Configuration
Base prefix: /api/v1/resource/

All endpoints
─────────────
GET/POST        /resource/materials/
GET/PATCH/DEL   /resource/materials/{id}/
POST            /resource/materials/{id}/stock-in/
POST            /resource/materials/{id}/stock-out/

GET/POST        /resource/equipment/
GET/PATCH/DEL   /resource/equipment/{id}/

GET/POST        /resource/workers/
GET/POST        /resource/worker-attendance/

GET/POST        /resource/suppliers/

GET/POST        /resource/purchase-orders/
POST            /resource/purchase-orders/{id}/receive/

GET/POST        /resource/purchase-items/

GET             /resource/stock-movements/

GET             /resource/dashboard/
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    MaterialViewSet,
    EquipmentViewSet,
    WorkerViewSet,
    WorkerAttendanceViewSet,
    SupplierViewSet,
    PurchaseOrderViewSet,
    PurchaseOrderItemViewSet,
    StockMovementViewSet,
    ResourceDashboardView,
)

router = DefaultRouter()
router.register(r"materials",         MaterialViewSet,          basename="resource-material")
router.register(r"equipment",         EquipmentViewSet,         basename="resource-equipment")
router.register(r"workers",           WorkerViewSet,            basename="resource-worker")
router.register(r"worker-attendance", WorkerAttendanceViewSet,  basename="resource-attendance")
router.register(r"suppliers",         SupplierViewSet,          basename="resource-supplier")
router.register(r"purchase-orders",   PurchaseOrderViewSet,     basename="resource-po")
router.register(r"purchase-items",    PurchaseOrderItemViewSet, basename="resource-po-item")
router.register(r"stock-movements",   StockMovementViewSet,     basename="resource-stock-movement")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", ResourceDashboardView.as_view(), name="resource-dashboard"),
]
