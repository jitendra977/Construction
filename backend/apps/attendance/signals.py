"""
attendance/signals.py
─────────────────────────────────────────────────────────────────────────────
Auto-link signals so that a real person only needs to be entered ONCE.

Rule:
  resource.Worker saved  → if no AttendanceWorker linked, auto-create & link one.
  The reverse (worker → contractor) is handled explicitly via person_add API
  rather than a signal, to avoid circular post_save loops.

Role → Trade mapping
  Maps resource.Worker.Role choices → attendance.AttendanceWorker.trade choices.
"""
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

# resource.Worker.Role → AttendanceWorker.trade
WORKER_ROLE_TO_TRADE = {
    "MASON":       "MASON",
    "CARPENTER":   "CARPENTER",
    "ELECTRICIAN": "ELECTRICIAN",
    "PLUMBER":     "PLUMBER",
    "PAINTER":     "PAINTER",
    "LABORER":     "HELPER",
    "SUPERVISOR":  "SUPERVISOR",
    "ENGINEER":    "ENGINEER",
    "OTHER":       "OTHER",
}

# Keep the old name as an alias so existing views.py imports don't break
contractor_post_save = None  # will be set after function definition


def _get_worker_display_name(worker):
    """Best available name for a resource.Worker record."""
    if worker.name and worker.name.strip():
        return worker.name.strip()
    return "Unnamed Worker"


@receiver(post_save, sender="resource.Worker")
def worker_post_save(sender, instance, created, **kwargs):
    """
    When a resource.Worker is CREATED:
      • Skip if it already has a linked AttendanceWorker (manually linked earlier).
      • Skip if there is no project (can't scope the worker).
      • Otherwise auto-create an AttendanceWorker and link both sides.

    When a resource.Worker is UPDATED:
      • If name/phone/daily_wage changed and there IS a linked worker, push the
        diff across (keep the worker in sync automatically).
    """
    from apps.attendance.models import AttendanceWorker

    # ── CREATE path ────────────────────────────────────────────────────────────
    if created:
        if not instance.project_id:
            logger.debug(
                "Worker %s has no project — skipping auto-worker creation.", instance.id
            )
            return

        # Already linked? (shouldn't happen on fresh create, but be safe)
        try:
            if instance.attendance_worker:
                return
        except AttendanceWorker.DoesNotExist:
            pass
        except Exception:
            pass

        trade      = WORKER_ROLE_TO_TRADE.get(instance.role, "OTHER")
        daily_rate = instance.daily_wage or 0
        name       = _get_worker_display_name(instance)

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
                contractor  = instance,
            )
            logger.info(
                "Signal: auto-created AttendanceWorker #%s '%s' for Worker %s '%s'",
                worker.id, worker.name, instance.id, instance.name,
            )
        except Exception as exc:
            logger.error(
                "Signal: failed to auto-create AttendanceWorker for Worker %s — %s",
                instance.id, exc,
            )
        return

    # ── UPDATE path — push diffs to linked worker ──────────────────────────────
    try:
        att_worker = instance.attendance_worker
    except Exception:
        return  # no linked worker, nothing to do

    update_fields = []
    new_name  = _get_worker_display_name(instance)
    new_phone = instance.phone or ""
    new_rate  = instance.daily_wage or 0

    if att_worker.name != new_name:
        att_worker.name  = new_name;  update_fields.append("name")
    if att_worker.phone != new_phone:
        att_worker.phone = new_phone; update_fields.append("phone")
    if instance.daily_wage and att_worker.daily_rate != new_rate:
        att_worker.daily_rate = new_rate; update_fields.append("daily_rate")

    if update_fields:
        att_worker.save(update_fields=update_fields)
        logger.info(
            "Signal: synced %s from Worker %s → AttendanceWorker #%s",
            update_fields, instance.id, att_worker.id,
        )


# Aliases kept for backward compatibility
contractor_post_save    = worker_post_save
CONTRACTOR_ROLE_TO_TRADE = WORKER_ROLE_TO_TRADE
