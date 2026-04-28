"""
attendance/signals.py
─────────────────────────────────────────────────────────────────────────────
Auto-link signals so that a real person only needs to be entered ONCE.

Rule:
  Contractor saved  → if no AttendanceWorker linked, auto-create & link one.
  The reverse (worker → contractor) is handled explicitly via person_add API
  rather than a signal, to avoid circular post_save loops.

Role → Trade mapping
  Maps resources.Contractor.role choices → attendance.AttendanceWorker.trade choices.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# Contractor.role → AttendanceWorker.trade
CONTRACTOR_ROLE_TO_TRADE = {
    "THEKEDAAR":  "SUPERVISOR",
    "ENGINEER":   "ENGINEER",
    "MISTRI":     "MASON",
    "LABOUR":     "HELPER",
    "ELECTRICIAN":"ELECTRICIAN",
    "PLUMBER":    "PLUMBER",
    "CARPENTER":  "CARPENTER",
    "PAINTER":    "PAINTER",
    "TILE_MISTRI":"TILE_SETTER",
    "WELDER":     "STEEL_FIXER",
    "OTHER":      "OTHER",
}


def _get_contractor_display_name(contractor):
    """Best available name for a contractor record."""
    if contractor.name and contractor.name.strip():
        return contractor.name.strip()
    if contractor.user:
        full = contractor.user.get_full_name()
        if full:
            return full
        return contractor.user.username
    return "Unnamed Worker"


@receiver(post_save, sender="resources.Contractor")
def contractor_post_save(sender, instance, created, **kwargs):
    """
    When a Contractor is CREATED:
      • Skip if it already has a linked AttendanceWorker (manually linked earlier).
      • Skip if there is no project (can't scope the worker).
      • Otherwise auto-create an AttendanceWorker and link both sides.

    When a Contractor is UPDATED:
      • If name/phone/daily_wage changed and there IS a linked worker, push the
        diff across (keep the worker in sync automatically).
    """
    from apps.attendance.models import AttendanceWorker

    # ── CREATE path ────────────────────────────────────────────────────────────
    if created:
        if not instance.project_id:
            logger.debug(
                "Contractor %s has no project — skipping auto-worker creation.", instance.id
            )
            return

        # Already linked? (shouldn't happen on fresh create, but be safe)
        try:
            if instance.attendance_worker_id:
                return
        except Exception:
            pass

        trade      = CONTRACTOR_ROLE_TO_TRADE.get(instance.role, "OTHER")
        daily_rate = instance.daily_wage or 0
        name       = _get_contractor_display_name(instance)

        # Enforce unique_together (project, name): append counter if clash
        final_name = name
        counter    = 1
        while AttendanceWorker.objects.filter(
            project_id=instance.project_id, name=final_name
        ).exists():
            final_name = f"{name} ({counter})"
            counter   += 1

        try:
            worker = AttendanceWorker.objects.create(
                project_id  = instance.project_id,
                name        = final_name,
                trade       = trade,
                worker_type = "LABOUR",
                daily_rate  = daily_rate,
                phone       = instance.phone or "",
                linked_user = instance.user,
                contractor  = instance,
            )
            logger.info(
                "Signal: auto-created AttendanceWorker #%s '%s' for Contractor #%s '%s'",
                worker.id, worker.name, instance.id, instance.name,
            )
        except Exception as exc:
            logger.error(
                "Signal: failed to auto-create AttendanceWorker for Contractor #%s — %s",
                instance.id, exc,
            )
        return

    # ── UPDATE path — push diffs to linked worker ──────────────────────────────
    try:
        worker = instance.attendance_worker
    except Exception:
        return  # no linked worker, nothing to do

    update_fields = []
    new_name  = _get_contractor_display_name(instance)
    new_phone = instance.phone or ""
    new_rate  = instance.daily_wage or 0

    if worker.name != new_name:
        worker.name  = new_name;  update_fields.append("name")
    if worker.phone != new_phone:
        worker.phone = new_phone; update_fields.append("phone")
    if instance.daily_wage and worker.daily_rate != new_rate:
        worker.daily_rate = new_rate; update_fields.append("daily_rate")

    if update_fields:
        worker.save(update_fields=update_fields)
        logger.info(
            "Signal: synced %s from Contractor #%s → AttendanceWorker #%s",
            update_fields, instance.id, worker.id,
        )
