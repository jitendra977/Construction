from django.contrib import admin

from .models import KnownPhrase, TranscriptionLog, VoiceCommand


@admin.register(VoiceCommand)
class VoiceCommandAdmin(admin.ModelAdmin):
    list_display = ("intent", "confidence", "raw_transcript", "user", "created_at")
    list_filter = ("intent", "language")
    search_fields = ("raw_transcript", "response_text")


@admin.register(KnownPhrase)
class KnownPhraseAdmin(admin.ModelAdmin):
    list_display = ("phrase", "intent", "language", "weight", "is_active")
    list_filter = ("intent", "language", "is_active")
    search_fields = ("phrase",)


@admin.register(TranscriptionLog)
class TranscriptionLogAdmin(admin.ModelAdmin):
    list_display = ("stt_backend", "duration_sec", "retained", "created_at")
