"""
ResourceDashboardView — summary statistics for the resource module.

GET /api/v1/resource/dashboard/?project=<id>
"""
from rest_framework.views import APIView
from rest_framework.response import Response

from ..models.material  import Material
from ..models.equipment import Equipment
from ..models.labor     import Worker
from ..models.supplier  import Supplier
from ..models.purchase  import PurchaseOrder, StockMovement
from ..serializers.purchase import StockMovementSerializer


class ResourceDashboardView(APIView):

    def get(self, request):
        pid = request.query_params.get("project")
        try:
            pid = int(pid) if pid and pid not in ("", "null") else None
        except ValueError:
            pid = None

        # ── Materials ────────────────────────────────────────────────────────
        mat_qs = Material.objects.all()
        if pid:
            mat_qs = mat_qs.filter(project_id=pid)
        all_materials  = list(mat_qs)
        total_value    = sum(m.stock_qty * m.unit_price for m in all_materials)
        low_stock_count = sum(1 for m in all_materials if m.is_low_stock)

        # ── Equipment ────────────────────────────────────────────────────────
        eq_qs = Equipment.objects.filter(is_active=True)
        if pid:
            eq_qs = eq_qs.filter(project_id=pid)
        equipment_list = list(eq_qs)
        available_eq   = sum(1 for e in equipment_list if e.status == "AVAILABLE")
        in_use_eq      = sum(1 for e in equipment_list if e.status == "IN_USE")

        # ── Labor ────────────────────────────────────────────────────────────
        wk_qs = Worker.objects.all()
        if pid:
            wk_qs = wk_qs.filter(project_id=pid)
        total_workers  = wk_qs.count()
        active_workers = wk_qs.filter(is_active=True).count()

        # ── Suppliers ────────────────────────────────────────────────────────
        sup_qs = Supplier.objects.all()
        if pid:
            sup_qs = sup_qs.filter(project_id=pid)
        total_suppliers = sup_qs.count()

        # ── Purchases ────────────────────────────────────────────────────────
        po_qs = PurchaseOrder.objects.all()
        if pid:
            po_qs = po_qs.filter(project_id=pid)
        total_purchases    = po_qs.count()
        draft_purchases    = po_qs.filter(status="DRAFT").count()
        ordered_purchases  = po_qs.filter(status="ORDERED").count()
        received_purchases = po_qs.filter(status="RECEIVED").count()

        # ── Recent Stock Movements ───────────────────────────────────────────
        mv_qs = StockMovement.objects.select_related("material").order_by("-created_at")
        if pid:
            mv_qs = mv_qs.filter(project_id=pid)
        recent_movements = StockMovementSerializer(mv_qs[:5], many=True).data

        return Response({
            "project_id": pid,
            "materials": {
                "total":           len(all_materials),
                "low_stock_count": low_stock_count,
                "total_value":     float(total_value),
            },
            "equipment": {
                "total":     len(equipment_list),
                "available": available_eq,
                "in_use":    in_use_eq,
            },
            "labor": {
                "total_workers":  total_workers,
                "active_workers": active_workers,
            },
            "suppliers": {
                "total": total_suppliers,
            },
            "purchases": {
                "total":    total_purchases,
                "draft":    draft_purchases,
                "ordered":  ordered_purchases,
                "received": received_purchases,
            },
            "recent_movements": recent_movements,
        })
