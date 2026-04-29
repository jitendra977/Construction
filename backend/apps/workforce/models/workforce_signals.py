"""
workforce/signals/workforce_signals.py

Keeps WorkforceMember in sync with linked AttendanceWorker records.
Register these in WorkforceConfig.ready() inside apps.py.
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender='attendance.AttendanceWorker')
def sync_member_project_on_attendance_save(sender, instance, created, **kwargs):
    """
    When an AttendanceWorker's project changes, mirror it on the
    linked WorkforceMember.current_project so dashboards stay consistent.
    """
    try:
        member = instance.workforce_member
    except Exception:
        return

    if member and member.current_project_id != instance.project_id:
        member.current_project = instance.project
        member.save(update_fields=['current_project', 'updated_at'])


@receiver(post_save, sender='workforce.WorkerContract')
def sync_daily_rate_on_contract_activate(sender, instance, **kwargs):
    """
    When a WorkerContract becomes ACTIVE (daily wage type),
    push the wage_amount to AttendanceWorker.daily_rate so both apps
    show the same rate without manual double-entry.
    """
    if instance.status != 'active':
        return
    if instance.wage_type != 'daily':
        return

    aw = getattr(instance.worker, 'attendance_worker', None)
    if aw and aw.daily_rate != instance.wage_amount:
        aw.daily_rate = instance.wage_amount
        aw.save(update_fields=['daily_rate', 'updated_at'])


@receiver(post_save, sender='workforce.WorkforceMember')
def sync_attendance_worker_active_status(sender, instance, **kwargs):
    """
    When a WorkforceMember is TERMINATED or BLACKLISTED,
    deactivate the linked AttendanceWorker so they can no longer scan QR codes.
    """
    INACTIVE_STATUSES = {'TERMINATED', 'BLACKLISTED', 'INACTIVE'}

    aw = getattr(instance, 'attendance_worker', None)
    if not aw:
        return

    should_be_active = instance.status not in INACTIVE_STATUSES
    if aw.is_active != should_be_active:
        aw.is_active = should_be_active
        aw.save(update_fields=['is_active', 'updated_at'])
