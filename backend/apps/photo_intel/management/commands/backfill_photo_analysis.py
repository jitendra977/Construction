"""
Backfill — run AI analysis on existing TaskMedia rows that don't have one yet.

Usage:
    python manage.py backfill_photo_analysis [--limit 100] [--reanalyze]
"""
from django.core.management.base import BaseCommand

from apps.tasks.models import TaskMedia
from apps.photo_intel.models import PhotoAnalysis
from apps.photo_intel.services.analyzer import analyze_task_media


class Command(BaseCommand):
    help = "Run Photo Intelligence analysis on existing TaskMedia rows."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=0, help="Max rows to process (0 = all)")
        parser.add_argument(
            "--reanalyze",
            action="store_true",
            help="Re-run analysis even for media that already have a result.",
        )

    def handle(self, *args, **opts):
        qs = TaskMedia.objects.filter(media_type="IMAGE").order_by("pk")
        if not opts["reanalyze"]:
            analyzed_ids = PhotoAnalysis.objects.filter(
                status="COMPLETED"
            ).values_list("media_id", flat=True)
            qs = qs.exclude(pk__in=analyzed_ids)
        if opts["limit"] > 0:
            qs = qs[: opts["limit"]]

        total = qs.count() if opts["limit"] == 0 else min(opts["limit"], qs.count())
        self.stdout.write(f"Analyzing {total} TaskMedia row(s)…")

        done = 0
        for media in qs.iterator():
            try:
                analyze_task_media(media)
                done += 1
            except Exception as e:  # noqa: BLE001
                self.stderr.write(f"  Failed media={media.pk}: {e}")
        self.stdout.write(self.style.SUCCESS(f"Done. Completed {done}/{total}."))
