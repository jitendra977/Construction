from rest_framework import serializers
from .models import MaterialRate, RateRevision, LaborRate, Estimate, EstimateSection, EstimateItem


class RateRevisionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = RateRevision
        fields = ["id", "old_rate", "new_rate", "change_pct", "reason", "created_at"]
        read_only_fields = fields


class MaterialRateSerializer(serializers.ModelSerializer):
    recent_revisions = RateRevisionSerializer(many=True, read_only=True, source="revisions")

    class Meta:
        model  = MaterialRate
        fields = [
            "id", "key", "name", "category", "unit",
            "rate", "min_rate", "max_rate", "region",
            "is_active", "updated_at", "recent_revisions",
        ]
        read_only_fields = ["id", "updated_at"]

    def update(self, instance, validated_data):
        new_rate = validated_data.get("rate")
        if new_rate and new_rate != instance.rate:
            old = instance.rate
            change = round((float(new_rate) - float(old)) / float(old) * 100, 2) if float(old) else 0
            RateRevision.objects.create(
                material   = instance,
                old_rate   = old,
                new_rate   = new_rate,
                change_pct = change,
                noted_by   = self.context["request"].user if "request" in self.context else None,
            )
        return super().update(instance, validated_data)


class LaborRateSerializer(serializers.ModelSerializer):
    trade_display = serializers.CharField(source="get_trade_display", read_only=True)

    class Meta:
        model  = LaborRate
        fields = ["id", "trade", "trade_display", "daily_rate", "region", "updated_at"]
        read_only_fields = ["id", "trade_display", "updated_at"]


class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = EstimateItem
        fields = [
            "id", "label", "category", "rate_key",
            "quantity", "unit", "unit_rate", "wastage_pct", "total", "notes",
        ]
        read_only_fields = ["id", "total"]


class EstimateSectionSerializer(serializers.ModelSerializer):
    items = EstimateItemSerializer(many=True, read_only=True)

    class Meta:
        model  = EstimateSection
        fields = [
            "id", "name", "phase_key", "order",
            "material_subtotal", "labor_subtotal", "subtotal",
            "items",
        ]
        read_only_fields = ["id", "material_subtotal", "labor_subtotal", "subtotal"]


class EstimateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""
    project_name   = serializers.CharField(source="project.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    quality_display= serializers.CharField(source="get_quality_tier_display", read_only=True)
    created_by_name= serializers.CharField(source="created_by.username", read_only=True)

    class Meta:
        model  = Estimate
        fields = [
            "id", "name", "status", "status_display",
            "quality_tier", "quality_display",
            "project", "project_name",
            "total_area_sqft", "floors", "bedrooms", "bathrooms",
            "grand_total", "material_total", "labor_total",
            "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "grand_total", "material_total", "labor_total",
            "status_display", "quality_display", "project_name",
            "created_by_name", "created_at", "updated_at",
        ]


class EstimateDetailSerializer(EstimateListSerializer):
    """Full serializer including nested sections + items."""
    sections = EstimateSectionSerializer(many=True, read_only=True)

    class Meta(EstimateListSerializer.Meta):
        fields = EstimateListSerializer.Meta.fields + [
            "description", "include_mep", "include_finishing",
            "contingency_pct", "contingency_amount", "notes",
            "sections",
        ]
        read_only_fields = EstimateListSerializer.Meta.read_only_fields + [
            "contingency_amount", "sections",
        ]


class EstimateCreateSerializer(serializers.ModelSerializer):
    """Used when creating / updating the estimate parameters."""
    class Meta:
        model  = Estimate
        fields = [
            "name", "description", "project", "status",
            "quality_tier", "total_area_sqft", "floors",
            "bedrooms", "bathrooms", "include_mep", "include_finishing",
            "contingency_pct", "notes",
        ]


# ── Calculator request serializer ────────────────────────────────────────────
class CalculateRequestSerializer(serializers.Serializer):
    calculator = serializers.ChoiceField(choices=[
        "wall", "concrete", "plaster", "pcc_flooring",
        "tile_flooring", "paint", "roofing", "excavation", "staircase",
    ])
    params = serializers.DictField(child=serializers.JSONField())


# ── Quick Estimate request serializer ────────────────────────────────────────
class QuickEstimateSerializer(serializers.Serializer):
    name            = serializers.CharField(max_length=200)
    total_area_sqft = serializers.FloatField(min_value=100)
    floors          = serializers.IntegerField(min_value=1, max_value=20, default=1)
    bedrooms        = serializers.IntegerField(min_value=1, default=2)
    bathrooms       = serializers.IntegerField(min_value=1, default=1)
    quality_tier    = serializers.ChoiceField(choices=["ECONOMY", "STANDARD", "PREMIUM", "LUXURY"], default="STANDARD")
    include_mep     = serializers.BooleanField(default=True)
    include_finishing = serializers.BooleanField(default=True)
    contingency_pct = serializers.FloatField(min_value=0, max_value=30, default=10)
    project         = serializers.IntegerField(required=False, allow_null=True)
    notes           = serializers.CharField(required=False, allow_blank=True, default="")
