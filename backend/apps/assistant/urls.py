from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    KnownPhraseViewSet,
    TranscriptionLogViewSet,
    VoiceCommandViewSet,
    ai_chat_view,
    transcribe_view,
    tts_view,
)

router = DefaultRouter()
router.register(r"voice-commands", VoiceCommandViewSet, basename="voice-command")
router.register(r"phrases",        KnownPhraseViewSet,  basename="known-phrase")
router.register(r"transcripts",    TranscriptionLogViewSet, basename="transcript")

urlpatterns = [
    path("", include(router.urls)),
    path("chat/",        ai_chat_view,   name="ai-chat"),
    path("transcribe/",  transcribe_view, name="ai-transcribe"),  # Groq Whisper STT
    path("tts/",         tts_view,        name="ai-tts"),          # ElevenLabs / OpenAI TTS
]
