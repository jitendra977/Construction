from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WallCalculatorView, ConcreteCalculatorView, PlasterCalculatorView, FlooringCalculatorView, StructuralBudgetView, ConstructionRateViewSet

router = DefaultRouter()
router.register(r'rates', ConstructionRateViewSet, basename='construction-rate')

urlpatterns = [
    path('', include(router.urls)),
    path('wall/', WallCalculatorView.as_view(), name='calculate-wall'),
    path('concrete/', ConcreteCalculatorView.as_view(), name='calculate-concrete'),
    path('plaster/', PlasterCalculatorView.as_view(), name='calculate-plaster'),
    path('flooring/', FlooringCalculatorView.as_view(), name='calculate-flooring'),
    path('budget/', StructuralBudgetView.as_view(), name='calculate-budget'),
]
