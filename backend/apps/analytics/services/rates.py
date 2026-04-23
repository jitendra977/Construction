"""
Rolling supplier × material price statistics.
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import List

from django.db.models import Avg, Count

from apps.resources.models import Material, MaterialTransaction, Supplier
from apps.analytics.models import SupplierRateTrend


def compute_rate_trends(window_end: date | None = None) -> List[SupplierRateTrend]:
    """
    Re-compute SupplierRateTrend rows for every supplier × material pair that
    has at least one IN transaction in the last 90 days.

    Uses only `IN` + `RECEIVED` transactions so returns/wastage don't skew
    price history.
    """
    window_end = window_end or date.today()
    window_start = window_end - timedelta(days=90)
    mid = window_end - timedelta(days=30)

    pairs = (
        MaterialTransaction.objects
        .filter(
            transaction_type="IN",
            status="RECEIVED",
            date__gte=window_start, date__lte=window_end,
            supplier__isnull=False, material__isnull=False,
            unit_price__isnull=False,
        )
        .values("supplier_id", "material_id")
        .annotate(n=Count("id"))
    )

    results: List[SupplierRateTrend] = []
    for pair in pairs:
        sid, mid_ = pair["supplier_id"], pair["material_id"]
        tx = list(
            MaterialTransaction.objects
            .filter(
                supplier_id=sid, material_id=mid_,
                transaction_type="IN", status="RECEIVED",
                date__gte=window_start, date__lte=window_end,
                unit_price__isnull=False,
            )
            .order_by("date", "id")
        )
        if not tx:
            continue

        last_30 = [t for t in tx if t.date >= mid]
        prior_30 = [t for t in tx if t.date < mid]

        def _avg(rows):
            if not rows:
                return None
            return sum((Decimal(r.unit_price) for r in rows), Decimal("0")) / len(rows)

        avg_30 = _avg(last_30)
        avg_prior = _avg(prior_30)
        avg_90 = _avg(tx) or Decimal("0")

        change_pct = 0.0
        if avg_30 is not None and avg_prior is not None and avg_prior != 0:
            change_pct = float((avg_30 - avg_prior) / avg_prior * 100)

        trend, _ = SupplierRateTrend.objects.update_or_create(
            supplier_id=sid, material_id=mid_,
            defaults={
                "first_seen_rate": tx[0].unit_price,
                "last_seen_rate": tx[-1].unit_price,
                "avg_rate_30d": avg_30 or avg_90,
                "avg_rate_90d": avg_90,
                "change_pct_last_month": round(change_pct, 2),
                "transactions_count": len(tx),
                "window_end": window_end,
            },
        )
        results.append(trend)
    return results
