from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CallSessionViewSet, ConversationViewSet, TeamMemberViewSet

router = DefaultRouter()
router.register(r"members", TeamMemberViewSet, basename="chat-member")
router.register(r"conversations", ConversationViewSet, basename="chat-conversation")
router.register(r"calls", CallSessionViewSet, basename="chat-call")

urlpatterns = [
    path("", include(router.urls)),
]
