from rest_framework import serializers

from .boq_models import (
    BoQTemplate,
    BoQTemplateItem,
    GeneratedBoQ,
    GeneratedBoQItem,
)


class BoQTemplateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BoQTemplateItem
        fields = "__all__"


class BoQTemplateSerializer(serializers.ModelSerializer):
    items = BoQTemplateItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = BoQTemplate
        fields = "__all__"

    def get_item_count(self, obj):
        return obj.items.count()


class GeneratedBoQItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedBoQItem
        fields = "__all__"


class GeneratedBoQSerializer(serializers.ModelSerializer):
    items = GeneratedBoQItemSerializer(many=True, read_only=True)
    template_name = serializers.CharField(source="template.name", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = GeneratedBoQ
        fields = "__all__"
        read_only_fields = (
            "material_total", "labor_total", "equipment_total", "other_total",
            "grand_total", "generated_at", "is_applied_to_budget",
        )


class GenerateBoQRequestSerializer(serializers.Serializer):
    """Body schema for POST /boq/generate/."""
    project_id = serializers.IntegerField()
    template_id = serializers.IntegerField(required=False)
    inputs = serializers.JSONField()
