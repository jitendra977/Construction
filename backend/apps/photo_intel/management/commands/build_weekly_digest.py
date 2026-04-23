"""
Build this week's WeeklyDigest + generate its project timelapse.

Intended to be invoked from cron / a scheduled task every Monday morning:

    0 7 * * 1 python manage.py build_weekly_digest
"""
from datetime import date, timedelta

from django.core.management.base import BaseCommand

from apps.photo_intel.services.digest import build_weekly_digest


class Command(BaseCommand):
    help = "Build the weekly digest (Mon→Sun containing --date, defaults to today)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--date",
            help="Any date inside the target week (YYYY-MM-DD). Defaults to today.",
            default=None,
        )

    def handle(self, *args, **opts):
        d = date.today()
        if opts["date"]:
            from datetime import datetime

            d = datetime.strptime(opts["date"], "%Y-%m-%d").date()
        week_start = d - timedelta(days=d.weekday())
        week_end = week_start + timedelta(days=6)
        self.stdout.write(f"Building digest for {week_start} → {week_end}…")
        digest = build_weekly_digest(week_start, week_end)
        self.stdout.write(self.style.SUCCESS(f"Digest id={digest.pk} — {digest.summary}"))
