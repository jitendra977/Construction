"""
signals.py — Tasks app

When a Task's estimated_cost changes, or a Task is added/deleted,
automatically keeps the following in sync:

  1. ConstructionPhase.estimated_budget
     → recalculated as SUM(task.estimated_cost) for all tasks in the phase

  2. accounting.PhaseBudgetLine.budgeted_amount (if it exists)
     → kept equal to the phase's estimated_budget

This is a one-way cascade:  Task → Phase → PhaseBudgetLine
Budget edits on the Phase or PhaseBudgetLine side are NOT propagated
back to tasks (to avoid infinite loops).
"""

from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Sum
from decimal import Decimal

from .models import Task


def _sync_phase_budget(phase):
    """
    Recompute ConstructionPhase.estimated_budget from its tasks,
    then mirror the value into the matching PhaseBudgetLine (if any).

    Called after any Task save/delete that touches this phase.
    """
    if phase is None:
        return

    # 1. Sum all task estimated costs for this phase
    task_total = (
        Task.objects.filter(phase=phase)
        .aggregate(t=Sum("estimated_cost"))["t"]
        or Decimal("0.00")
    )

    # 2. Update ConstructionPhase.estimated_budget
    if phase.estimated_budget != task_total:
        phase.estimated_budget = task_total
        phase.save(update_fields=["estimated_budget"])

    # 3. Mirror into accounting.PhaseBudgetLine (best-effort, no crash if missing)
    try:
        from apps.accounting.models.budget import PhaseBudgetLine

        pbl = PhaseBudgetLine.objects.filter(phase=phase).first()
        if pbl and pbl.budgeted_amount != task_total:
            pbl.budgeted_amount = task_total
            pbl.save(update_fields=["budgeted_amount"])
    except Exception:
        pass  # accounting app not installed / migration not run yet


@receiver(post_save, sender=Task)
def task_saved(sender, instance, created, **kwargs):
    """
    Fires after a Task is created or updated.
    We need to handle two cases:
    - The task's phase didn't change (normal cost edit)
    - The task was moved to a different phase (rare but possible)

    Django doesn't give us the old value on post_save, so we store a
    pre_save snapshot on the instance in a pre_save receiver.
    """
    # Sync current phase
    _sync_phase_budget(instance.phase)

    # Sync old phase too (if the task was moved between phases)
    old_phase = getattr(instance, "_pre_save_phase", None)
    if old_phase and old_phase != instance.phase:
        _sync_phase_budget(old_phase)


@receiver(post_delete, sender=Task)
def task_deleted(sender, instance, **kwargs):
    """Fires after a Task is deleted — subtract its cost from its phase."""
    _sync_phase_budget(instance.phase)


# ── pre_save: snapshot the OLD phase before the save ─────────────────────────

from django.db.models.signals import pre_save


@receiver(pre_save, sender=Task)
def task_pre_save(sender, instance, **kwargs):
    """
    Snapshot the currently-saved phase BEFORE the save overwrites it.
    Stored as _pre_save_phase on the instance so post_save can use it
    to clean up the old phase if the task was moved.
    """
    if instance.pk:
        try:
            old = Task.objects.only("phase").get(pk=instance.pk)
            instance._pre_save_phase = old.phase
        except Task.DoesNotExist:
            instance._pre_save_phase = None
    else:
        instance._pre_save_phase = None
