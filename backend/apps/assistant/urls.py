from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import KnownPhraseViewSet, TranscriptionLogViewSet, VoiceCommandViewSet

router = DefaultRouter()
router.register(r"voice-commands", VoiceCommandViewSet, basename="voice-command")
router.register(r"phrases", KnownPhraseViewSet, basename="known-phrase")
router.register(r"transcripts", TranscriptionLogViewSet, basename="transcript")

urlpatterns = [path("", include(router.urls))]
