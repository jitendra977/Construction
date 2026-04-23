"""
Weekly digest — synthesises a human-facing progress report for a Mon→Sun window.

Inputs pulled:
  - TaskMedia + PhotoAnalysis (mismatches, low-quality photos)
  - Task (completed this week)
  - MaterialTransaction (stock consumed)
  - Expense (spend)

Output: WeeklyDigest row (reused per week_start/week_end). Also kicks off a
PROJECT-scope Timelapse for the week.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import List

from django.db.models import Count, Sum
from django.utils import timezone

from apps.finance.models import Expense
from apps.resources.models import MaterialTransaction
from apps.tasks.models import Task, TaskMedia

from apps.photo_intel.models import PhotoAnalysis, Timelapse, WeeklyDigest


def build_weekly_digest(week_start: date, week_end: date) -> WeeklyDigest:
    """Idempotent: re-running updates the existing row for this week."""
    digest, _ = WeeklyDigest.objects.get_or_create(
        week_start=week_start, week_end=week_end
    )

    start_dt = datetime.combine(week_start, time.min)
    end_dt = datetime.combine(week_end, time.max)

    # ── Metrics ────────────────────────────────────────────────
    tasks_completed = Task.objects.filter(
        status="COMPLETED",
        completed_date__gte=week_start,
        completed_date__lte=week_end,
    ).count()
    tasks_started = Task.objects.filter(
        start_date__gte=week_start, start_date__lte=week_end
    ).count()

    media_uploaded = TaskMedia.objects.filter(
        created_at__gte=start_dt, created_at__lte=end_dt
    ).count()

    mat_used = (
        MaterialTransaction.objects.filter(
            transaction_type="OUT", status="RECEIVED",
            date__gte=week_start, date__lte=week_end,
        ).aggregate(total=Sum("quantity"))["total"] or Decimal("0")
    )

    spend = (
        Expense.objects.filter(
            date__gte=week_start, date__lte=week_end,
            is_inventory_usage=False,
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")
    )

    # ── Alerts: AI mismatches this week ────────────────────────
    mismatches = list(
        PhotoAnalysis.objects.filter(
            media__created_at__gte=start_dt,
            media__created_at__lte=end_dt,
            phase_match="MISMATCH",
            phase_confidence__gte=0.6,
        ).select_related("media", "media__task")[:10]
    )
    alerts: List[dict] = [
        {
            "type": "phase_mismatch",
            "task_id": a.media.task_id,
            "task_title": a.media.task.title if a.media.task else "",
            "detected": a.detected_phase_label,
            "expected_phase": a.media.task.phase.name if (a.media.task and a.media.task.phase) else "",
            "confidence": a.phase_confidence,
            "media_id": a.media_id,
        }
        for a in mismatches
    ]

    digest.metrics = {
        "tasks_completed": tasks_completed,
        "tasks_started": tasks_started,
        "media_uploaded": media_uploaded,
        "material_units_used": float(mat_used),
        "spend_npr": float(spend),
    }
    digest.alerts = alerts
    digest.summary = (
        f"यो हप्ता: {tasks_completed} task पूरा, {tasks_started} suru भयो. "
        f"{media_uploaded} photos upload भए, Rs. {spend:,.0f} खर्च भयो. "
        f"{len(alerts)} वटा phase-mismatch alert छन्।"
    )
    digest.save()

    # ── Auto-generate project-scope timelapse for the week ─────
    existing = digest.timelapses.filter(scope="PROJECT").first()
    if not existing:
        from apps.photo_intel.services.timelapse import regenerate_for_scope

        tl = regenerate_for_scope(
            scope="PROJECT",
            period_start=week_start,
            period_end=week_end,
            title=f"Weekly Project — {week_start} → {week_end}",
            auto_generated=True,
        )
        digest.timelapses.add(tl)

    return digest
