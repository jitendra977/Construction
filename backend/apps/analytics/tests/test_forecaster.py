"""
Tests for the pure-Python OLS forecaster and alert synthesiser.
"""
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase

from apps.analytics.models import BudgetAlert, BudgetForecast, SupplierRateTrend
from apps.analytics.services.alerts import rebuild_alerts
from apps.analytics.services.forecaster import _linear_fit, forecast_category
from apps.core.models import HouseProject
from apps.finance.models import BudgetCategory, Expense
from apps.resource.models import Material, Supplier


class LinearFitTests(TestCase):
    def test_fit_recovers_slope_and_intercept_on_clean_line(self):
        # y = 3x + 5
        pts = [(float(i), 3.0 * i + 5.0) for i in range(10)]
        fit = _linear_fit(pts)
        self.assertAlmostEqual(fit.slope, 3.0, places=6)
        self.assertAlmostEqual(fit.intercept, 5.0, places=6)
        self.assertAlmostEqual(fit.r_squared, 1.0, places=6)

    def test_fit_zero_for_single_point(self):
        fit = _linear_fit([(0.0, 10.0)])
        self.assertEqual(fit.slope, 0.0)
        self.assertEqual(fit.intercept, 0.0)

    def test_r_squared_clamped(self):
        pts = [(0.0, 1.0), (1.0, 1.0), (2.0, 1.0)]  # flat → ss_tot=0
        fit = _linear_fit(pts)
        self.assertGreaterEqual(fit.r_squared, 0.0)
        self.assertLessEqual(fit.r_squared, 1.0)


class ForecastCategoryTests(TestCase):
    def setUp(self):
        self.hp = HouseProject.objects.create(
            name="Test Home",
            owner_name="Test Owner",
            address="Kathmandu",
            total_budget=Decimal("1000000"),
            start_date=date.today() - timedelta(days=30),
            expected_completion_date=date.today() + timedelta(days=120),
            area_sqft=1200,
        )
        self.cat = BudgetCategory.objects.create(
            name="Cement",
            allocation=Decimal("100000"),
        )

    def _make_expense(self, amount, days_ago):
        return Expense.objects.create(
            title=f"Purchase {days_ago}",
            amount=Decimal(str(amount)),
            expense_type="MATERIAL",
            category=self.cat,
            date=date.today() - timedelta(days=days_ago),
            paid_to="Supplier",
            is_inventory_usage=False,
        )

    def test_no_spend_returns_low_risk(self):
        forecast = forecast_category(self.cat)
        self.assertEqual(forecast.risk_level, "LOW")
        self.assertEqual(forecast.daily_burn_rate, Decimal("0.00"))
        self.assertIsNone(forecast.days_to_exhaustion)

    def test_detects_burn_rate(self):
        # Rs. 1000/day for 30 days
        for i in range(30):
            self._make_expense(1000, i)
        forecast = forecast_category(self.cat)
        # Allow some slack — should be well above 0 and below 2000/day
        self.assertGreater(float(forecast.daily_burn_rate), 100)
        self.assertIsNotNone(forecast.days_to_exhaustion)


class AlertsTests(TestCase):
    def setUp(self):
        self.cat = BudgetCategory.objects.create(
            name="Steel", allocation=Decimal("50000")
        )
        # Burn so fast that exhaustion is days away
        BudgetForecast.objects.create(
            category=self.cat,
            allocation=Decimal("50000"),
            spent_to_date=Decimal("30000"),
            days_observed=30,
            daily_burn_rate=Decimal("5000"),
            weekly_burn_rate=Decimal("35000"),
            projected_total=Decimal("200000"),
            projected_overrun=Decimal("150000"),
            days_to_exhaustion=4,  # ≤ 7
            exhaustion_date=date.today() + timedelta(days=4),
            confidence=0.9,
            risk_level="HIGH",
        )

    def test_creates_forecast_overrun_and_burn_alerts(self):
        alerts = rebuild_alerts()
        types = {a.alert_type for a in alerts}
        self.assertIn("FORECAST_OVERRUN", types)
        self.assertIn("BURN_TOO_FAST", types)

        critical = BudgetAlert.objects.filter(alert_type="BURN_TOO_FAST").first()
        self.assertEqual(critical.severity, "CRITICAL")

    def test_rebuild_resolves_stale_alerts(self):
        rebuild_alerts()
        # Now clear the forecast so the alert condition is gone
        BudgetForecast.objects.filter(category=self.cat).update(
            projected_overrun=Decimal("0"),
            days_to_exhaustion=None,
            risk_level="LOW",
        )
        rebuild_alerts()
        still_open = BudgetAlert.objects.filter(is_resolved=False)
        self.assertEqual(still_open.count(), 0)

    def test_rate_spike_alert_levels(self):
        hp = HouseProject.objects.create(
            name="Rate Test Home",
            owner_name="Test Owner",
            address="Kathmandu",
            total_budget=Decimal("500000"),
            start_date=date.today(),
            expected_completion_date=date.today() + timedelta(days=90),
            area_sqft=800,
        )
        supplier = Supplier.objects.create(project=hp, name="Hari Hardware", phone="9800000000")
        material = Material.objects.create(
            name="OPC Cement", unit="bag", unit_price=Decimal("800"), project=hp
        )
        SupplierRateTrend.objects.create(
            supplier=supplier, material=material,
            first_seen_rate=Decimal("800"), last_seen_rate=Decimal("880"),
            avg_rate_30d=Decimal("880"), avg_rate_90d=Decimal("810"),
            change_pct_last_month=12.5, transactions_count=6,
            window_end=date.today(),
        )
        rebuild_alerts()
        a = BudgetAlert.objects.get(alert_type="RATE_SPIKE")
        self.assertEqual(a.severity, "CRITICAL")
