from django.contrib import admin

from .models import PhotoAnalysis, Timelapse, WeeklyDigest


@admin.register(PhotoAnalysis)
class PhotoAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        "id", "media_id", "status", "detected_phase_label",
        "phase_confidence", "phase_match", "quality_score", "created_at",
    )
    list_filter = ("status", "phase_match", "detected_phase_key", "analyzer_name")
    search_fields = ("media__task__title", "tags")
    readonly_fields = (
        "media", "status", "detected_phase_key", "detected_phase_label",
        "phase_confidence", "phase_match", "tags", "detected_objects",
        "quality_score", "brightness", "dominant_colors", "analyzer_name",
        "raw_response", "error_message", "created_at", "updated_at",
    )


@admin.register(Timelapse)
class TimelapseAdmin(admin.ModelAdmin):
    list_display = (
        "id", "title", "scope", "media_count", "status",
        "period_start", "period_end", "auto_generated", "created_at",
    )
    list_filter = ("scope", "status", "auto_generated")
    search_fields = ("title",)
    autocomplete_fields = ()  # keep simple
    readonly_fields = ("media_count", "duration_seconds", "status", "error_message")


@admin.register(WeeklyDigest)
class WeeklyDigestAdmin(admin.ModelAdmin):
    list_display = ("id", "week_start", "week_end", "emailed", "created_at")
    list_filter = ("emailed",)
    filter_horizontal = ("timelapses",)
