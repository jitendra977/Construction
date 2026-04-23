"""
Budget forecaster — pure-Python linear regression (no numpy/sklearn dep).

For each BudgetCategory we:
  1. Build a daily cumulative-spend series from Expense rows (excluding
     internal inventory usage), over the last N days.
  2. Fit a simple linear regression cumulative_spend = a * day_index + b.
  3. Project to `exhaustion_date` (where cumulative hits allocation) and
     to `expected_completion_date` (from HouseProject) for the total.
  4. Compute R² on the fit and compress it to [0, 1] as `confidence`.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Iterable, List, Optional, Tuple

from django.db.models import Sum

from apps.core.models import HouseProject
from apps.finance.models import BudgetCategory, Expense

from apps.analytics.models import BudgetForecast


WINDOW_DAYS = 60  # how much history to use for regression


@dataclass
class _Fit:
    slope: float   # Rs. per day
    intercept: float
    r_squared: float
    n_points: int


def _linear_fit(points: List[Tuple[float, float]]) -> _Fit:
    """Ordinary least squares. Returns zero fit if fewer than 2 points."""
    n = len(points)
    if n < 2:
        return _Fit(0.0, 0.0, 0.0, n)

    sum_x = sum(p[0] for p in points)
    sum_y = sum(p[1] for p in points)
    mean_x = sum_x / n
    mean_y = sum_y / n

    num = sum((p[0] - mean_x) * (p[1] - mean_y) for p in points)
    den = sum((p[0] - mean_x) ** 2 for p in points)
    slope = num / den if den else 0.0
    intercept = mean_y - slope * mean_x

    ss_tot = sum((p[1] - mean_y) ** 2 for p in points)
    ss_res = sum((p[1] - (slope * p[0] + intercept)) ** 2 for p in points)
    r2 = 1 - (ss_res / ss_tot) if ss_tot else 0.0
    r2 = max(0.0, min(1.0, r2))
    return _Fit(slope, intercept, r2, n)


def _risk_level(projected_overrun: Decimal, allocation: Decimal) -> str:
    if allocation <= 0:
        return "LOW"
    ratio = float(projected_overrun) / float(allocation)
    if ratio <= 0:
        return "LOW"
    if ratio < 0.10:
        return "MEDIUM"
    return "HIGH"


def forecast_category(category: BudgetCategory) -> BudgetForecast:
    today = date.today()
    start = today - timedelta(days=WINDOW_DAYS)

    # Pull daily expense totals within window
    qs = (
        Expense.objects
        .filter(category=category, is_inventory_usage=False, date__gte=start, date__lte=today)
        .values("date")
        .annotate(daily=Sum("amount"))
        .order_by("date")
    )

    # Build cumulative series indexed by day offset from `start`
    cum = Decimal("0")
    daily_map = {row["date"]: Decimal(row["daily"] or 0) for row in qs}
    points: List[Tuple[float, float]] = []
    for i in range(WINDOW_DAYS + 1):
        d = start + timedelta(days=i)
        cum += daily_map.get(d, Decimal("0"))
        points.append((float(i), float(cum)))

    fit = _linear_fit(points)

    # Compute scalar outputs
    allocation = Decimal(category.allocation or 0)
    spent_to_date = Decimal(category.total_spent or 0)

    daily_burn = Decimal(str(max(0.0, fit.slope)))
    weekly_burn = daily_burn * 7

    # Projection horizon — until expected completion of the project
    horizon_days = 90  # default
    hp = HouseProject.objects.order_by("-id").first()
    if hp and hp.expected_completion_date:
        horizon_days = max(1, (hp.expected_completion_date - today).days)

    projected_extra = daily_burn * horizon_days
    projected_total = spent_to_date + projected_extra
    projected_overrun = max(Decimal("0"), projected_total - allocation)

    # Days to exhaustion
    days_to_exhaustion: Optional[int] = None
    exhaustion_date: Optional[date] = None
    if daily_burn > 0:
        remaining = allocation - spent_to_date
        if remaining > 0:
            days_to_exhaustion = int(remaining / daily_burn)
            exhaustion_date = today + timedelta(days=days_to_exhaustion)

    risk = _risk_level(projected_overrun, allocation)

    forecast, _ = BudgetForecast.objects.update_or_create(
        category=category,
        defaults={
            "allocation": allocation,
            "spent_to_date": spent_to_date,
            "days_observed": fit.n_points,
            "daily_burn_rate": daily_burn,
            "weekly_burn_rate": weekly_burn,
            "projected_total": projected_total,
            "projected_overrun": projected_overrun,
            "days_to_exhaustion": days_to_exhaustion,
            "exhaustion_date": exhaustion_date,
            "confidence": round(fit.r_squared, 3),
            "risk_level": risk,
        },
    )
    return forecast


def refresh_all_forecasts() -> Iterable[BudgetForecast]:
    results = []
    for cat in BudgetCategory.objects.all():
        results.append(forecast_category(cat))
    return results
