from rest_framework.routers import DefaultRouter

from .views import BudgetAlertViewSet, BudgetForecastViewSet, SupplierRateTrendViewSet

router = DefaultRouter()
router.register(r"forecasts", BudgetForecastViewSet, basename="forecast")
router.register(r"rate-trends", SupplierRateTrendViewSet, basename="rate-trend")
router.register(r"alerts", BudgetAlertViewSet, basename="budget-alert")

urlpatterns = router.urls
