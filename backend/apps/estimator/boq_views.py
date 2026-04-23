"""
BoQ Auto-Generator API.

  GET  /api/v1/estimator/boq-templates/        — list templates
  POST /api/v1/estimator/boq-templates/         — create template (admin)
  GET  /api/v1/estimator/boqs/                 — list generated BoQs
  POST /api/v1/estimator/boqs/generate/         — generate BoQ for a project
  POST /api/v1/estimator/boqs/{id}/apply/       — push into BudgetCategories
  GET  /api/v1/estimator/boqs/{id}/pdf/         — optional PDF export
  POST /api/v1/estimator/boqs/seed-defaults/    — create stock templates
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import HouseProject

from .boq_generator import apply_to_budget, generate_boq, seed_default_templates
from .boq_models import BoQTemplate, GeneratedBoQ
from .boq_serializers import (
    BoQTemplateSerializer,
    GenerateBoQRequestSerializer,
    GeneratedBoQSerializer,
)


class BoQTemplateViewSet(viewsets.ModelViewSet):
    queryset = BoQTemplate.objects.prefetch_related("items").all()
    serializer_class = BoQTemplateSerializer

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        templates = list(seed_default_templates())
        return Response({"created": [t.name for t in templates]})


class GeneratedBoQViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GeneratedBoQ.objects.prefetch_related("items").select_related("template", "project").all()
    serializer_class = GeneratedBoQSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get("project")
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs

    @action(detail=False, methods=["post"])
    def generate(self, request):
        serializer = GenerateBoQRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            project = HouseProject.objects.get(pk=data["project_id"])
        except HouseProject.DoesNotExist:
            return Response(
                {"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND
            )

        template = None
        if data.get("template_id"):
            try:
                template = BoQTemplate.objects.get(pk=data["template_id"])
            except BoQTemplate.DoesNotExist:
                return Response(
                    {"error": "Template not found."}, status=status.HTTP_404_NOT_FOUND
                )

        user = request.user if request.user and request.user.is_authenticated else None
        boq = generate_boq(
            project=project, inputs=data["inputs"], template=template, generated_by=user
        )
        return Response(
            GeneratedBoQSerializer(boq).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"])
    def apply(self, request, pk=None):
        boq = self.get_object()
        results = apply_to_budget(boq)
        return Response({"applied": results, "boq_id": boq.id})
