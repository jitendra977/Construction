"""
Voice Assistant "साथी" models.

VoiceCommand          — one utterance from the user: raw transcript, parsed
                        intent, response text, whether it was executed.
TranscriptionLog      — persisted audio clip metadata (optional; the actual
                        audio is discarded unless the user opted in to
                        keep it for model fine-tuning).
KnownPhrase           — small in-DB lexicon of Nepali trigger phrases the
                        parser consults. Admins can curate this without
                        redeploying code.
"""
from django.conf import settings
from django.db import models


class VoiceCommand(models.Model):
    INTENT_CHOICES = [
        ("STOCK_CHECK", "Stock Check"),
        ("BUDGET_CHECK", "Budget Check"),
        ("TASK_ADD", "Add Task"),
        ("TASK_COMPLETE", "Complete Task"),
        ("EXPENSE_ADD", "Log Expense"),
        ("NEXT_STEP", "What to Do Next"),
        ("HELP", "Help"),
        ("UNKNOWN", "Unknown"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="voice_commands",
    )
    raw_transcript = models.TextField()
    language = models.CharField(max_length=10, default="ne", help_text="'ne' / 'en'")

    intent = models.CharField(max_length=30, choices=INTENT_CHOICES, default="UNKNOWN")
    parsed_entities = models.JSONField(default=dict, blank=True)
    confidence = models.FloatField(default=0.0)

    response_text = models.TextField(blank=True)
    executed = models.BooleanField(default=False)
    error = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.intent}] {self.raw_transcript[:60]}"


class TranscriptionLog(models.Model):
    """Optional audio retention — only kept if the user opts in."""
    STT_CHOICES = [
        ("browser", "Browser SpeechRecognition"),
        ("whisper", "OpenAI Whisper"),
        ("google", "Google Speech-to-Text"),
        ("manual", "Typed fallback"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="transcriptions",
    )
    command = models.ForeignKey(
        VoiceCommand, on_delete=models.CASCADE, related_name="transcriptions",
        null=True, blank=True,
    )
    audio_file = models.FileField(upload_to="voice-clips/", null=True, blank=True)
    stt_backend = models.CharField(max_length=20, choices=STT_CHOICES, default="browser")
    duration_sec = models.FloatField(default=0.0)
    retained = models.BooleanField(default=False, help_text="Kept for fine-tuning?")
    created_at = models.DateTimeField(auto_now_add=True)


class KnownPhrase(models.Model):
    """Curated lexicon of Nepali / Nepali-English phrases → intent."""

    phrase = models.CharField(max_length=200, db_index=True)
    language = models.CharField(max_length=10, default="ne")
    intent = models.CharField(max_length=30, choices=VoiceCommand.INTENT_CHOICES)
    weight = models.FloatField(default=1.0)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["intent", "phrase"]
        unique_together = ("phrase", "intent")

    def __str__(self):
        return f"[{self.intent}] {self.phrase}"
