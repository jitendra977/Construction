from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import HouseProject

from .copilot_models import (
    ChecklistItem,
    DeadlineReminder,
    DocumentTemplate,
    MunicipalityStep,
    MunicipalityTemplate,
    PermitChecklist,
)
from .copilot_services import (
    materialise_checklist,
    refresh_deadlines,
    seed_kathmandu_template,
)


# ─── Serializers ─────────────────────────────────────────────────────
class DocumentTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentTemplate
        fields = "__all__"


class MunicipalityStepSerializer(serializers.ModelSerializer):
    required_documents = DocumentTemplateSerializer(many=True, read_only=True)

    class Meta:
        model = MunicipalityStep
        fields = "__all__"


class MunicipalityTemplateSerializer(serializers.ModelSerializer):
    steps = MunicipalityStepSerializer(many=True, read_only=True)

    class Meta:
        model = MunicipalityTemplate
        fields = "__all__"


class ChecklistItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChecklistItem
        fields = "__all__"


class DeadlineReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeadlineReminder
        fields = "__all__"


class PermitChecklistSerializer(serializers.ModelSerializer):
    items = ChecklistItemSerializer(many=True, read_only=True)
    progress_pct = serializers.SerializerMethodField()
    template_name = serializers.CharField(source="template.name", read_only=True)

    class Meta:
        model = PermitChecklist
        fields = "__all__"

    def get_progress_pct(self, obj):
        return obj.progress_pct()


# ─── ViewSets ────────────────────────────────────────────────────────
class MunicipalityTemplateViewSet(viewsets.ModelViewSet):
    queryset = MunicipalityTemplate.objects.prefetch_related("steps__required_documents")
    serializer_class = MunicipalityTemplateSerializer

    @action(detail=False, methods=["post"], url_path="seed-kathmandu")
    def seed_kathmandu(self, request):
        tmpl = seed_kathmandu_template()
        return Response(MunicipalityTemplateSerializer(tmpl).data)


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    queryset = DocumentTemplate.objects.all()
    serializer_class = DocumentTemplateSerializer


class PermitChecklistViewSet(viewsets.ModelViewSet):
    queryset = PermitChecklist.objects.prefetch_related("items").select_related("template")
    serializer_class = PermitChecklistSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=["post"], url_path="materialise")
    def materialise(self, request):
        project_id = request.data.get("project_id")
        template_id = request.data.get("template_id")
        if not project_id or not template_id:
            return Response(
                {"error": "project_id and template_id are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            project = HouseProject.objects.get(pk=project_id)
            template = MunicipalityTemplate.objects.get(pk=template_id)
        except (HouseProject.DoesNotExist, MunicipalityTemplate.DoesNotExist):
            return Response(
                {"error": "Project or template not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        cl = materialise_checklist(project=project, template=template)
        return Response(PermitChecklistSerializer(cl).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="refresh-deadlines")
    def refresh(self, request):
        n = refresh_deadlines()
        return Response({"overdue_marked": n})


class ChecklistItemViewSet(viewsets.ModelViewSet):
    queryset = ChecklistItem.objects.all()
    serializer_class = ChecklistItemSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        checklist_id = self.request.query_params.get("checklist")
        if checklist_id:
            qs = qs.filter(checklist_id=checklist_id)
        return qs


class DeadlineReminderViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = DeadlineReminder.objects.select_related("item").all()
    serializer_class = DeadlineReminderSerializer
