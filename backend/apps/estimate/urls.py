from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaterialRateViewSet,
    LaborRateViewSet,
    EstimateViewSet,
    CalculateView,
    QuickEstimateView,
    EstimateItemUpdateView,
)

router = DefaultRouter()
router.register(r"material-rates", MaterialRateViewSet, basename="material-rate")
router.register(r"labor-rates",    LaborRateViewSet,    basename="labor-rate")
router.register(r"estimates",      EstimateViewSet,     basename="estimate")

urlpatterns = [
    path("",                        include(router.urls)),
    path("calculate/",              CalculateView.as_view(),        name="estimate-calculate"),
    path("quick/",                  QuickEstimateView.as_view(),    name="estimate-quick"),
    path("items/<int:pk>/",         EstimateItemUpdateView.as_view(), name="estimate-item-update"),
]
