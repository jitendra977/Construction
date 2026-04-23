"""
Signal handlers — fan-out analysis when TaskMedia rows are created.

By default we run analysis in a background thread so the upload request
returns immediately. If `settings.PHOTO_INTEL_SYNC=True` (e.g. during tests),
analysis runs synchronously.
"""
from __future__ import annotations

import logging
import threading

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.tasks.models import TaskMedia

logger = logging.getLogger(__name__)


def _run(media_id: int):
    try:
        from apps.tasks.models import TaskMedia as _TM
        from apps.photo_intel.services.analyzer import analyze_task_media

        media = _TM.objects.get(pk=media_id)
        analyze_task_media(media)
    except Exception:  # noqa: BLE001
        logger.exception("photo_intel background analysis failed for media=%s", media_id)


@receiver(post_save, sender=TaskMedia)
def schedule_analysis(sender, instance: TaskMedia, created, **kwargs):
    if not created:
        return
    if not getattr(settings, "PHOTO_INTEL_ENABLED", True):
        return

    if getattr(settings, "PHOTO_INTEL_SYNC", False):
        _run(instance.pk)
        return

    # Fire & forget in a daemon thread — good enough for dev/small deployments.
    # Swap with Celery by pointing to apps.photo_intel.tasks.run_analysis.
    t = threading.Thread(target=_run, args=(instance.pk,), daemon=True)
    t.start()
