from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MaterialRate, LaborRate, Estimate, EstimateSection, EstimateItem
from .serializers import (
    MaterialRateSerializer,
    LaborRateSerializer,
    EstimateListSerializer,
    EstimateDetailSerializer,
    EstimateCreateSerializer,
    EstimateItemSerializer,
    CalculateRequestSerializer,
    QuickEstimateSerializer,
)
from .services import CalculatorService, EstimateBuilder, RateLoader


# ─────────────────────────────────────────────────────────────────────────────
#  Material Rates
# ─────────────────────────────────────────────────────────────────────────────
class MaterialRateViewSet(viewsets.ModelViewSet):
    queryset           = MaterialRate.objects.filter(is_active=True).prefetch_related("revisions")
    serializer_class   = MaterialRateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs  = super().get_queryset()
        cat = self.request.query_params.get("category")
        if cat:
            qs = qs.filter(category=cat)
        return qs

    def perform_create(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=False, methods=["get"])
    def all_rates(self, request):
        """Returns the combined dict used by CalculatorService (DB + defaults)."""
        return Response({
            "materials": RateLoader.materials(),
            "labor":     RateLoader.labor(),
        })

    @action(detail=False, methods=["post"], url_path="bulk-update")
    def bulk_update(self, request):
        """
        Bulk update rates. Body: [{"key": "CEMENT", "rate": 850}, ...]
        """
        updates = request.data if isinstance(request.data, list) else []
        updated = []
        errors  = []
        for item in updates:
            key  = item.get("key")
            rate = item.get("rate")
            if not key or rate is None:
                errors.append({"key": key, "error": "key and rate are required"})
                continue
            try:
                mr   = MaterialRate.objects.get(key=key)
                ser  = MaterialRateSerializer(mr, data={"rate": rate}, partial=True, context={"request": request})
                if ser.is_valid():
                    ser.save(updated_by=request.user)
                    updated.append(key)
                else:
                    errors.append({"key": key, "error": ser.errors})
            except MaterialRate.DoesNotExist:
                errors.append({"key": key, "error": "not found"})
        return Response({"updated": updated, "errors": errors})

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        """Seed the DB with default material rates (idempotent)."""
        from .services import DEFAULT_MATERIAL_RATES
        UNITS = {
            "CEMENT": ("CEMENT", "BAG"), "SAND": ("SAND", "CFT"), "AGGREGATE": ("AGGREGATE", "CFT"),
            "BRICK": ("BRICK", "PCS"), "ROD": ("STEEL", "KG"), "PAINT_INT": ("PAINT", "SQFT"),
            "PAINT_EXT": ("PAINT", "SQFT"), "TILE_BASIC": ("TILE", "SQFT"), "TILE_PREMIUM": ("TILE", "SQFT"),
            "TILE_ADHESIVE": ("TILE", "SQFT"), "TILE_GROUT": ("TILE", "SQFT"),
            "WATERPROOF": ("WATERPROOF", "SQFT"), "FORMWORK": ("OTHER", "SQFT"),
            "DOOR_BASIC": ("TIMBER", "SET"), "DOOR_PREMIUM": ("TIMBER", "SET"),
            "WINDOW_BASIC": ("GLASS", "SET"), "WINDOW_PREMIUM": ("GLASS", "SET"),
            "PLUMBING_BATH": ("PLUMBING", "SET"), "ELECTRICAL": ("ELECTRICAL", "SQFT"),
        }
        created = []
        for key, rate in DEFAULT_MATERIAL_RATES.items():
            cat, unit = UNITS.get(key, ("OTHER", "PCS"))
            obj, c = MaterialRate.objects.get_or_create(
                key=key,
                defaults={"name": key.replace("_", " ").title(), "category": cat, "unit": unit, "rate": rate},
            )
            if c:
                created.append(key)
        return Response({"seeded": created, "message": f"{len(created)} rates created."})


# ─────────────────────────────────────────────────────────────────────────────
#  Labor Rates
# ─────────────────────────────────────────────────────────────────────────────
class LaborRateViewSet(viewsets.ModelViewSet):
    queryset           = LaborRate.objects.all()
    serializer_class   = LaborRateSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        from .services import DEFAULT_LABOR_RATES
        created = []
        for trade, rate in DEFAULT_LABOR_RATES.items():
            _, c = LaborRate.objects.get_or_create(
                trade=trade,
                defaults={"daily_rate": rate},
            )
            if c:
                created.append(trade)
        return Response({"seeded": created, "message": f"{len(created)} labor rates created."})


# ─────────────────────────────────────────────────────────────────────────────
#  Estimates
# ─────────────────────────────────────────────────────────────────────────────
class EstimateViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Estimate.objects.select_related("project", "created_by").prefetch_related(
            "sections__items"
        )
        project_id = self.request.query_params.get("project")
        status_    = self.request.query_params.get("status")
        if project_id:
            qs = qs.filter(project_id=project_id)
        if status_:
            qs = qs.filter(status=status_)
        return qs.order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EstimateCreateSerializer
        if self.action in ("retrieve",):
            return EstimateDetailSerializer
        return EstimateListSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def generate(self, request, pk=None):
        """Re-build all sections/items from the estimate's parameters."""
        estimate = self.get_object()
        EstimateBuilder.build(estimate)
        return Response(EstimateDetailSerializer(estimate, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Clone this estimate as a new DRAFT."""
        src = self.get_object()
        src.pk        = None
        src.name      = f"Copy of {src.name}"
        src.status    = "DRAFT"
        src.save()
        EstimateBuilder.build(src)
        return Response(
            EstimateListSerializer(src, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"])
    def set_status(self, request, pk=None):
        estimate = self.get_object()
        new_status = request.data.get("status")
        if new_status not in dict(Estimate.STATUS_CHOICES):
            return Response({"error": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)
        estimate.status = new_status
        estimate.save(update_fields=["status"])
        return Response({"status": new_status})

    @action(detail=True, methods=["post"], url_path="recalculate")
    def recalculate(self, request, pk=None):
        """Recalculate totals from existing items (if items were edited manually)."""
        estimate = self.get_object()
        for sec in estimate.sections.all():
            for item in sec.items.all():
                item.save()     # triggers total recalculation
            sec.recalculate()
        estimate.recalculate_totals()
        return Response(EstimateDetailSerializer(estimate, context={"request": request}).data)


# ─────────────────────────────────────────────────────────────────────────────
#  Estimate Item update (edit single line item)
# ─────────────────────────────────────────────────────────────────────────────
class EstimateItemUpdateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        try:
            item = EstimateItem.objects.select_related("section__estimate").get(pk=pk)
        except EstimateItem.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        ser = EstimateItemSerializer(item, data=request.data, partial=True)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        ser.save()

        # Cascade recalculation up
        section  = item.section
        section.recalculate()
        estimate = section.estimate
        estimate.recalculate_totals()

        return Response(ser.data)

    def delete(self, request, pk):
        try:
            item = EstimateItem.objects.select_related("section__estimate").get(pk=pk)
        except EstimateItem.DoesNotExist:
            return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        section  = item.section
        estimate = section.estimate
        item.delete()
        section.recalculate()
        estimate.recalculate_totals()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─────────────────────────────────────────────────────────────────────────────
#  Calculator Endpoint (unified)
# ─────────────────────────────────────────────────────────────────────────────
class CalculateView(APIView):
    """
    POST /api/v1/estimate/calculate/
    Body: { "calculator": "wall", "params": { "length_ft": 20, "height_ft": 10 } }
    """
    permission_classes = [permissions.IsAuthenticated]

    CALCULATORS = {
        "wall":         CalculatorService.wall,
        "concrete":     CalculatorService.concrete,
        "plaster":      CalculatorService.plaster,
        "pcc_flooring": CalculatorService.pcc_flooring,
        "tile_flooring":CalculatorService.tile_flooring,
        "paint":        CalculatorService.paint,
        "roofing":      CalculatorService.roofing,
        "excavation":   CalculatorService.excavation,
        "staircase":    CalculatorService.staircase,
    }

    def post(self, request):
        ser = CalculateRequestSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        calc_name = ser.validated_data["calculator"]
        params    = ser.validated_data["params"]
        calc_fn   = self.CALCULATORS[calc_name]

        try:
            result = calc_fn(**params)
        except TypeError as e:
            return Response({"error": f"Invalid parameters: {e}"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(result)


# ─────────────────────────────────────────────────────────────────────────────
#  Quick Estimate (generate + save in one call)
# ─────────────────────────────────────────────────────────────────────────────
class QuickEstimateView(APIView):
    """
    POST /api/v1/estimate/quick/
    Creates a full Estimate record with all sections from params.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = QuickEstimateSerializer(data=request.data)
        if not ser.is_valid():
            return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)

        d = ser.validated_data

        project = None
        if d.get("project"):
            from apps.core.models import HouseProject
            try:
                project = HouseProject.objects.get(pk=d["project"])
            except HouseProject.DoesNotExist:
                return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)

        estimate = Estimate.objects.create(
            name            = d["name"],
            project         = project,
            total_area_sqft = d["total_area_sqft"],
            floors          = d["floors"],
            bedrooms        = d["bedrooms"],
            bathrooms       = d["bathrooms"],
            quality_tier    = d["quality_tier"],
            include_mep     = d["include_mep"],
            include_finishing = d["include_finishing"],
            contingency_pct = d["contingency_pct"],
            notes           = d.get("notes", ""),
            created_by      = request.user,
        )

        EstimateBuilder.build(estimate)

        return Response(
            EstimateDetailSerializer(estimate, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
