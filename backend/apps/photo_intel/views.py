from datetime import date, timedelta

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import ConstructionPhase, Floor, Room

from .models import PhotoAnalysis, Timelapse, WeeklyDigest
from .serializers import (
    PhotoAnalysisSerializer,
    TimelapseCreateSerializer,
    TimelapseSerializer,
    WeeklyDigestSerializer,
)
from .services.analyzer import analyze_task_media
from .services.timelapse import generate_timelapse, regenerate_for_scope


class PhotoAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PhotoAnalysis.objects.select_related(
        "media", "media__task", "media__task__phase"
    ).all()
    serializer_class = PhotoAnalysisSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("task"):
            qs = qs.filter(media__task_id=p["task"])
        if p.get("phase_match"):
            qs = qs.filter(phase_match=p["phase_match"])
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("min_confidence"):
            try:
                qs = qs.filter(phase_confidence__gte=float(p["min_confidence"]))
            except ValueError:
                pass
        return qs

    @action(detail=True, methods=["post"])
    def reanalyze(self, request, pk=None):
        """Force re-analysis of a single media row."""
        analysis = self.get_object()
        analyze_task_media(analysis.media)
        analysis.refresh_from_db()
        return Response(self.get_serializer(analysis).data)

    @action(detail=False, methods=["get"])
    def mismatches(self, request):
        """High-confidence phase mismatches — candidates for homeowner review."""
        qs = self.get_queryset().filter(
            phase_match="MISMATCH", phase_confidence__gte=0.6
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        qs = self.get_queryset()
        data = {
            "total": qs.count(),
            "completed": qs.filter(status="COMPLETED").count(),
            "pending": qs.filter(status__in=["PENDING", "PROCESSING"]).count(),
            "failed": qs.filter(status="FAILED").count(),
            "matches": qs.filter(phase_match="MATCH").count(),
            "mismatches": qs.filter(phase_match="MISMATCH").count(),
            "avg_quality": (
                qs.filter(status="COMPLETED").aggregate(
                    avg=models_avg("quality_score")
                )["avg"] or 0.0
            ),
        }
        return Response(data)


def models_avg(field):
    from django.db.models import Avg

    return Avg(field)


class TimelapseViewSet(viewsets.ModelViewSet):
    queryset = Timelapse.objects.all().select_related("room", "floor", "phase")
    serializer_class = TimelapseSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        p = self.request.query_params
        if p.get("scope"):
            qs = qs.filter(scope=p["scope"])
        if p.get("room"):
            qs = qs.filter(room_id=p["room"])
        if p.get("floor"):
            qs = qs.filter(floor_id=p["floor"])
        if p.get("phase"):
            qs = qs.filter(phase_id=p["phase"])
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        return qs

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Create & render a timelapse synchronously."""
        ser = TimelapseCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data

        room = floor = phase = None
        if data.get("room"):
            room = get_object_or_404(Room, pk=data["room"])
        if data.get("floor"):
            floor = get_object_or_404(Floor, pk=data["floor"])
        if data.get("phase"):
            phase = get_object_or_404(ConstructionPhase, pk=data["phase"])

        tl = regenerate_for_scope(
            scope=data["scope"],
            room=room,
            floor=floor,
            phase=phase,
            period_start=data["period_start"],
            period_end=data["period_end"],
            title=data.get("title", ""),
            user=request.user if request.user.is_authenticated else None,
        )
        return Response(
            TimelapseSerializer(tl, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"])
    def regenerate(self, request, pk=None):
        """Re-render an existing timelapse (picks up newly-uploaded frames)."""
        tl = self.get_object()
        generate_timelapse(tl)
        tl.refresh_from_db()
        return Response(self.get_serializer(tl).data)


class WeeklyDigestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WeeklyDigest.objects.all().prefetch_related("timelapses")
    serializer_class = WeeklyDigestSerializer

    @action(detail=False, methods=["post"])
    def build_current(self, request):
        """Generate this week's digest on demand (Mon→Sun containing today)."""
        from .services.digest import build_weekly_digest

        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        digest = build_weekly_digest(week_start, week_end)
        return Response(self.get_serializer(digest).data)
