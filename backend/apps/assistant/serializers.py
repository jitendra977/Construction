from rest_framework import serializers

from .models import KnownPhrase, TranscriptionLog, VoiceCommand


class VoiceCommandSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceCommand
        fields = "__all__"
        read_only_fields = (
            "intent", "parsed_entities", "confidence",
            "response_text", "executed", "error", "created_at",
        )


class TranscriptionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = TranscriptionLog
        fields = "__all__"


class KnownPhraseSerializer(serializers.ModelSerializer):
    class Meta:
        model = KnownPhrase
        fields = "__all__"


class AskRequestSerializer(serializers.Serializer):
    transcript = serializers.CharField()
    language = serializers.CharField(required=False, default="ne")
