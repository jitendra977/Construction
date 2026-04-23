from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import KnownPhrase, TranscriptionLog, VoiceCommand
from .serializers import (
    AskRequestSerializer,
    KnownPhraseSerializer,
    TranscriptionLogSerializer,
    VoiceCommandSerializer,
)
from .services.dispatcher import dispatch
from .services.parser import parse


class VoiceCommandViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = VoiceCommand.objects.all()
    serializer_class = VoiceCommandSerializer

    @action(detail=False, methods=["post"])
    def ask(self, request):
        req = AskRequestSerializer(data=request.data)
        req.is_valid(raise_exception=True)
        transcript = req.validated_data["transcript"]
        language = req.validated_data.get("language", "ne")

        result = parse(transcript)
        response_text = dispatch(result)

        cmd = VoiceCommand.objects.create(
            user=request.user if request.user and request.user.is_authenticated else None,
            raw_transcript=transcript,
            language=language,
            intent=result.intent,
            parsed_entities=result.entities,
            confidence=result.confidence,
            response_text=response_text,
            executed=result.intent != "UNKNOWN",
        )
        return Response(VoiceCommandSerializer(cmd).data, status=status.HTTP_201_CREATED)


class KnownPhraseViewSet(viewsets.ModelViewSet):
    queryset = KnownPhrase.objects.all()
    serializer_class = KnownPhraseSerializer


class TranscriptionLogViewSet(viewsets.ModelViewSet):
    queryset = TranscriptionLog.objects.all()
    serializer_class = TranscriptionLogSerializer
