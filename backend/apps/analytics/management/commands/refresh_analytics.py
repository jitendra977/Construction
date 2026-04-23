"""
Refresh forecasts + rate trends + alerts. Run nightly from cron.
"""
from django.core.management.base import BaseCommand

from apps.analytics.services import compute_rate_trends, rebuild_alerts, refresh_all_forecasts


class Command(BaseCommand):
    help = "Refresh BudgetForecast, SupplierRateTrend and BudgetAlert rows."

    def handle(self, *args, **opts):
        f = refresh_all_forecasts()
        t = compute_rate_trends()
        a = rebuild_alerts()
        self.stdout.write(self.style.SUCCESS(
            f"OK — forecasts={len(list(f))}, rate_trends={len(t)}, alerts={len(a)}"
        ))
