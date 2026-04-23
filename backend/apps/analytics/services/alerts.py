"""
Alert synthesiser — walks the latest BudgetForecast + SupplierRateTrend data
and upserts BudgetAlert rows. The UI simply reads BudgetAlert; this module is
the single place alert thresholds live.
"""
from __future__ import annotations

from decimal import Decimal
from typing import List

from apps.analytics.models import BudgetAlert, BudgetForecast, SupplierRateTrend


# Thresholds
SPIKE_WARN_PCT = 4.0       # supplier rate up ≥ 4% MoM
SPIKE_CRITICAL_PCT = 10.0  # ≥ 10% MoM
BURN_DAYS_WARN = 21        # ≤ 3 weeks to exhaustion
BURN_DAYS_CRITICAL = 7     # ≤ 1 week


def _upsert(alert_type: str, scope_key: str, **defaults) -> BudgetAlert:
    obj, _ = BudgetAlert.objects.update_or_create(
        alert_type=alert_type, scope_key=scope_key, defaults=defaults
    )
    return obj


def rebuild_alerts() -> List[BudgetAlert]:
    """
    Recompute alerts from scratch (idempotent — existing rows are updated,
    stale ones are resolved).
    """
    kept_keys = set()
    alerts: List[BudgetAlert] = []

    # ── FORECAST_OVERRUN + BURN_TOO_FAST ─────────────────────────
    for f in BudgetForecast.objects.select_related("category").all():
        scope = f"category:{f.category_id}"

        if f.projected_overrun and f.projected_overrun > 0:
            severity = "CRITICAL" if f.risk_level == "HIGH" else "WARNING"
            alerts.append(_upsert(
                "FORECAST_OVERRUN", scope,
                title=f"{f.category.name}: projected overrun Rs. {f.projected_overrun:,.0f}",
                message=(
                    f"At the current daily burn of Rs. {f.daily_burn_rate:,.0f}, "
                    f"{f.category.name} is projected to finish Rs. {f.projected_overrun:,.0f} "
                    f"over its Rs. {f.allocation:,.0f} allocation by project end."
                ),
                severity=severity,
                data={
                    "category_id": f.category_id,
                    "projected_overrun": float(f.projected_overrun),
                    "allocation": float(f.allocation),
                    "daily_burn": float(f.daily_burn_rate),
                    "confidence": f.confidence,
                },
                is_resolved=False,
            ))
            kept_keys.add(("FORECAST_OVERRUN", scope))

        if f.days_to_exhaustion is not None and f.days_to_exhaustion <= BURN_DAYS_WARN:
            severity = "CRITICAL" if f.days_to_exhaustion <= BURN_DAYS_CRITICAL else "WARNING"
            alerts.append(_upsert(
                "BURN_TOO_FAST", scope,
                title=f"{f.category.name}: budget runs out in {f.days_to_exhaustion} days",
                message=(
                    f"Cash for {f.category.name} will be exhausted on "
                    f"{f.exhaustion_date}. Slow spending or top up the allocation."
                ),
                severity=severity,
                data={
                    "category_id": f.category_id,
                    "days_to_exhaustion": f.days_to_exhaustion,
                    "exhaustion_date": f.exhaustion_date.isoformat() if f.exhaustion_date else None,
                },
                is_resolved=False,
            ))
            kept_keys.add(("BURN_TOO_FAST", scope))

    # ── RATE_SPIKE ───────────────────────────────────────────────
    for t in SupplierRateTrend.objects.select_related("supplier", "material").all():
        if t.change_pct_last_month < SPIKE_WARN_PCT:
            continue
        scope = f"supplier:{t.supplier_id}/material:{t.material_id}"
        severity = "CRITICAL" if t.change_pct_last_month >= SPIKE_CRITICAL_PCT else "WARNING"
        alerts.append(_upsert(
            "RATE_SPIKE", scope,
            title=f"{t.material.name} price up {t.change_pct_last_month:+.1f}% at {t.supplier.name}",
            message=(
                f"30-day average rate moved from Rs. {t.avg_rate_90d:,.0f} to "
                f"Rs. {t.avg_rate_30d:,.0f}. Consider comparing alternative suppliers."
            ),
            severity=severity,
            data={
                "supplier_id": t.supplier_id,
                "material_id": t.material_id,
                "change_pct": t.change_pct_last_month,
                "avg_30d": float(t.avg_rate_30d),
                "avg_90d": float(t.avg_rate_90d),
            },
            is_resolved=False,
        ))
        kept_keys.add(("RATE_SPIKE", scope))

    # ── Auto-resolve stale alerts ────────────────────────────────
    stale = BudgetAlert.objects.exclude(is_resolved=True).values_list("alert_type", "scope_key")
    for at, sk in stale:
        if (at, sk) not in kept_keys:
            BudgetAlert.objects.filter(alert_type=at, scope_key=sk).update(
                is_resolved=True, resolved_note="auto-resolved: condition cleared",
            )

    return alerts
