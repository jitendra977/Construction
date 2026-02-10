from django.urls import path
from .views import WallCalculatorView, ConcreteCalculatorView

urlpatterns = [
    path('wall/', WallCalculatorView.as_view(), name='calculate-wall'),
    path('concrete/', ConcreteCalculatorView.as_view(), name='calculate-concrete'),
]
