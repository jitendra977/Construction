"""
Photo Intelligence & Timelapse models.

PhotoAnalysis — AI-derived metadata for a TaskMedia image
  (detected phase, object tags, quality, confidence, phase-match verdict).

Timelapse      — a generated video/GIF stitched from chronologically-ordered
  TaskMedia for a given Room / Floor / Phase / date-range.

WeeklyDigest   — auto-generated homeowner-facing progress report anchored
  on a Timelapse + summary stats.
"""
from django.db import models
from django.conf import settings

from apps.tasks.models import TaskMedia
from apps.core.models import Room, Floor, ConstructionPhase


class PhotoAnalysis(models.Model):
    """
    One-to-one AI analysis of a single TaskMedia image.
    Populated asynchronously after a TaskMedia upload.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending Analysis"),
        ("PROCESSING", "Processing"),
        ("COMPLETED", "Completed"),
        ("FAILED", "Failed"),
        ("SKIPPED", "Skipped (non-image / unsupported)"),
    ]

    PHASE_MATCH_CHOICES = [
        ("MATCH", "Matches Task Phase"),
        ("MISMATCH", "Does Not Match Task Phase"),
        ("INCONCLUSIVE", "Inconclusive"),
        ("NO_PHASE", "Task has no phase"),
    ]

    media = models.OneToOneField(
        TaskMedia,
        on_delete=models.CASCADE,
        related_name="analysis",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    # ── Phase classification ────────────────────────────────────────────
    detected_phase_key = models.CharField(
        max_length=50,
        blank=True,
        help_text="One of the PHASE_KEYS constants (FOUNDATION, BRICKWORK, etc.)",
    )
    detected_phase_label = models.CharField(max_length=100, blank=True)
    phase_confidence = models.FloatField(
        default=0.0,
        help_text="0.0–1.0 confidence of the detected phase",
    )
    phase_match = models.CharField(
        max_length=20,
        choices=PHASE_MATCH_CHOICES,
        default="INCONCLUSIVE",
    )

    # ── Object detections (JSON list of {label, confidence, bbox}) ──────
    detected_objects = models.JSONField(default=list, blank=True)
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text="Flat list of human-readable tags like 'rebar', 'shuttering', 'brickwork'",
    )

    # ── Quality & meta ──────────────────────────────────────────────────
    quality_score = models.FloatField(
        default=0.0,
        help_text="0.0–1.0 overall quality (resolution, blur, lighting heuristic)",
    )
    brightness = models.FloatField(default=0.0)
    dominant_colors = models.JSONField(default=list, blank=True)

    # ── Provenance ──────────────────────────────────────────────────────
    analyzer_name = models.CharField(
        max_length=50,
        blank=True,
        help_text="Which analyzer produced this (heuristic, google_vision, openai_vision, …)",
    )
    raw_response = models.JSONField(
        default=dict, blank=True, help_text="Raw analyzer output for debugging"
    )
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Photo Analysis"
        verbose_name_plural = "Photo Analyses"

    def __str__(self):
        return f"Analysis #{self.id} for Media #{self.media_id} ({self.status})"

    @property
    def has_mismatch_warning(self):
        return self.phase_match == "MISMATCH" and self.phase_confidence >= 0.6


class Timelapse(models.Model):
    """
    Generated video/GIF stitched from TaskMedia images within a scope.

    Scope is one of: Room, Floor, or ConstructionPhase (can be any combination).
    """

    SCOPE_CHOICES = [
        ("ROOM", "Single Room"),
        ("FLOOR", "Entire Floor"),
        ("PHASE", "Construction Phase"),
        ("PROJECT", "Whole Project"),
    ]

    STATUS_CHOICES = [
        ("QUEUED", "Queued"),
        ("GENERATING", "Generating"),
        ("READY", "Ready"),
        ("FAILED", "Failed"),
        ("NO_MEDIA", "No Media Found"),
    ]

    title = models.CharField(max_length=200)
    scope = models.CharField(max_length=10, choices=SCOPE_CHOICES)

    room = models.ForeignKey(
        Room, on_delete=models.SET_NULL, null=True, blank=True, related_name="timelapses"
    )
    floor = models.ForeignKey(
        Floor, on_delete=models.SET_NULL, null=True, blank=True, related_name="timelapses"
    )
    phase = models.ForeignKey(
        ConstructionPhase,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timelapses",
    )

    period_start = models.DateField()
    period_end = models.DateField()

    media_count = models.PositiveIntegerField(default=0)
    source_media = models.ManyToManyField(
        TaskMedia, blank=True, related_name="timelapses"
    )

    # Output artefacts
    video_file = models.FileField(
        upload_to="timelapses/videos/", null=True, blank=True
    )
    gif_file = models.FileField(upload_to="timelapses/gifs/", null=True, blank=True)
    thumbnail = models.ImageField(
        upload_to="timelapses/thumbs/", null=True, blank=True
    )
    duration_seconds = models.FloatField(default=0.0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="QUEUED")
    error_message = models.TextField(blank=True)

    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timelapses_generated",
    )
    auto_generated = models.BooleanField(
        default=False,
        help_text="Was this produced by the weekly/automated pipeline?",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.scope}, {self.media_count} frames)"


class WeeklyDigest(models.Model):
    """
    Auto-generated Monday-morning progress report combining:
      - the week's timelapse(s)
      - task completion stats
      - budget burn & material consumption highlights
      - alerts / mismatches flagged by the AI analyzer
    """

    week_start = models.DateField()  # Monday
    week_end = models.DateField()  # Sunday

    summary = models.TextField(blank=True, help_text="Human-readable summary")
    metrics = models.JSONField(default=dict, blank=True)
    alerts = models.JSONField(default=list, blank=True)
    timelapses = models.ManyToManyField(Timelapse, blank=True, related_name="digests")

    emailed = models.BooleanField(default=False)
    emailed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-week_start"]
        unique_together = ("week_start", "week_end")

    def __str__(self):
        return f"Digest {self.week_start} → {self.week_end}"
