from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GeofenceViewSet,
    LocationPingView,
    LivePositionsView,
    LocationHistoryView,
    PresenceAnalyticsView,
    SitePinViewSet,
)

router = DefaultRouter()
router.register(r'geofences', GeofenceViewSet, basename='geofence')
router.register(r'analytics', PresenceAnalyticsView, basename='presence-analytics')
router.register(r'pins', SitePinViewSet, basename='site-pin')

urlpatterns = [
    path('ping/', LocationPingView.as_view(), name='location-ping'),
    path('live/', LivePositionsView.as_view(), name='location-live'),
    path('history/', LocationHistoryView.as_view(), name='location-history'),
    path('', include(router.urls)),
]
