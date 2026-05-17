import re
import requests as _req_module

from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Direct session — bypasses system HTTP_PROXY / HTTPS_PROXY env vars
_direct = _req_module.Session()
_direct.trust_env = False

# ── Nepali number-to-words + TTS text cleaner ─────────────────────────────────
_NE_ONES = [
    '', 'एक', 'दुई', 'तीन', 'चार', 'पाँच', 'छ', 'सात', 'आठ', 'नौ',
    'दश', 'एघार', 'बाह्र', 'तेह्र', 'चौध', 'पन्ध्र', 'सोह्र', 'सत्र', 'अठार', 'उन्नाइस',
]
_NE_TENS = ['', '', 'बीस', 'तीस', 'चालीस', 'पचास', 'साठी', 'सत्तरी', 'असी', 'नब्बे']

def _num_to_nepali(n: int) -> str:
    if n < 0:   return 'माइनस ' + _num_to_nepali(-n)
    if n == 0:  return 'शून्य'
    if n < 20:  return _NE_ONES[n]
    if n < 100:
        t = _NE_TENS[n // 10]
        return t if n % 10 == 0 else t + ' ' + _NE_ONES[n % 10]
    if n < 1_000:
        r = n % 100
        return _NE_ONES[n // 100] + ' सय' + ('' if r == 0 else ' ' + _num_to_nepali(r))
    if n < 1_00_000:
        r = n % 1_000
        return _num_to_nepali(n // 1_000) + ' हजार' + ('' if r == 0 else ' ' + _num_to_nepali(r))
    if n < 1_00_00_000:
        r = n % 1_00_000
        return _num_to_nepali(n // 1_00_000) + ' लाख' + ('' if r == 0 else ' ' + _num_to_nepali(r))
    r = n % 1_00_00_000
    return _num_to_nepali(n // 1_00_00_000) + ' करोड' + ('' if r == 0 else ' ' + _num_to_nepali(r))

def _prepare_tts(text: str, lang: str = 'ne') -> str:
    """Clean AI response text for natural TTS speech."""
    # Strip markdown / emoji symbols
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*',     r'\1', text)
    text = re.sub(r'#+\s*',         '',    text)
    text = re.sub(r'[✅⚠️🤖📊📋➕🏗️📈🔊✓_`~]', '', text)
    text = re.sub(r'\[.*?\]\(.*?\)', lambda m: m.group(0).split(']')[0][1:], text)  # [label](url) → label

    if lang == 'ne':
        # Rs. / रु. → spoken रुपैयाँ
        text = re.sub(r'Rs\.?\s*', 'रुपैयाँ ', text, flags=re.IGNORECASE)
        text = re.sub(r'रु\.?\s*',  'रुपैयाँ ', text)

        # Numbers with commas → Nepali words  e.g. 1,20,000 → एक लाख बीस हजार
        def _replace(m):
            raw = m.group(0).replace(',', '')
            try:
                return _num_to_nepali(int(raw))
            except ValueError:
                return raw
        text = re.sub(r'[\d,]+', _replace, text)

        # % → प्रतिशत
        text = re.sub(r'%', ' प्रतिशत', text)
    else:
        # English: just remove Rs., clean commas
        text = re.sub(r'Rs\.?\s*', 'rupees ', text, flags=re.IGNORECASE)
        text = re.sub(r'(\d),(\d)', r'\1\2', text)  # remove thousands comma

    # Collapse whitespace
    text = re.sub(r'\n+', '। ', text)
    text = re.sub(r'\s{2,}', ' ', text)
    return text.strip()

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


# ── AI Chat ───────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_chat_view(request):
    """
    POST /api/v1/assistant/chat/
    Body: {message, history, project_id, language, provider}
    """
    message    = (request.data.get("message") or "").strip()
    history    = request.data.get("history") or []
    project_id = request.data.get("project_id")
    language   = request.data.get("language", "en")
    provider   = request.data.get("provider", "auto")

    if not message:
        return Response({"detail": "message is required."}, status=status.HTTP_400_BAD_REQUEST)

    from .services.ai_chat import ai_chat
    result = ai_chat(
        message=message,
        history=history,
        project_id=project_id,
        language=language,
        provider=provider,
    )

    VoiceCommand.objects.create(
        user=request.user,
        raw_transcript=message,
        language=language,
        intent=result.get("intent") or "UNKNOWN",
        parsed_entities=result.get("data") or {},
        confidence=1.0 if result.get("source") in ("groq", "gemini", "openai") else 0.5,
        response_text=result.get("message", ""),
        executed=False,
    )

    return Response(result, status=status.HTTP_200_OK)


# ── Groq Whisper STT ──────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def transcribe_view(request):
    """
    POST /api/v1/assistant/transcribe/
    Form-data: audio (file), language ('ne'|'en')

    Uses Groq's Whisper-large-v3-turbo — ultra-fast, accurate, free tier.
    Falls back to a 503 if GROQ_API_KEY is not set.
    """
    from django.conf import settings

    audio_file = request.FILES.get("audio")
    if not audio_file:
        return Response({"detail": "audio file required"}, status=status.HTTP_400_BAD_REQUEST)

    lang = request.data.get("language", "ne")
    # Groq Whisper language codes
    lang_code = "ne" if lang == "ne" else "en"

    groq_key = getattr(settings, "GROQ_API_KEY", "") or ""
    if not groq_key:
        return Response({"detail": "GROQ_API_KEY not configured"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    try:
        raw = audio_file.read()
        filename = audio_file.name or "audio.webm"
        mime     = audio_file.content_type or "audio/webm"

        resp = _direct.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {groq_key}"},
            files={"file": (filename, raw, mime)},
            data={
                "model": "whisper-large-v3-turbo",
                "response_format": "json",
                "language": lang_code,
                "temperature": 0,
            },
            timeout=30,
        )
        resp.raise_for_status()
        transcript = resp.json().get("text", "").strip()
        return Response({"transcript": transcript, "language": lang_code})

    except Exception as e:
        return Response({"detail": f"Transcription failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


# ── TTS ───────────────────────────────────────────────────────────────────────
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def tts_view(request):
    """
    POST /api/v1/assistant/tts/
    Body: {text, voice_id (optional), lang ('ne'|'en')}
    Returns: audio/mpeg binary

    Priority:
      1. Microsoft Edge TTS  — FREE, no key, neural Nepali voice (ne-NP-HemkalaNeural)
      2. ElevenLabs          — if ELEVENLABS_API_KEY is set
      3. OpenAI TTS          — if OPENAI_API_KEY is set
      4. 502 with detail
    """
    from django.conf import settings

    text = (request.data.get("text") or "").strip()
    if not text:
        return Response({"detail": "text required"}, status=status.HTTP_400_BAD_REQUEST)

    lang     = (request.data.get("lang") or "ne").strip()
    voice_id = (request.data.get("voice_id") or "").strip()

    # Clean text for natural speech (convert numbers, remove markdown)
    spoken_text = _prepare_tts(text, lang)

    # ── 1. Microsoft Edge TTS (FREE — no API key needed) ──────────────────────
    try:
        import asyncio
        import edge_tts

        # Pick a neural voice based on language
        if not voice_id:
            voice_id = "ne-NP-HemkalaNeural" if lang == "ne" else "en-US-JennyNeural"

        async def _speak():
            communicate = edge_tts.Communicate(spoken_text, voice_id)
            chunks = []
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    chunks.append(chunk["data"])
            return b"".join(chunks)

        audio = asyncio.run(_speak())
        if audio:
            return HttpResponse(audio, content_type="audio/mpeg")
    except Exception as e:
        pass  # fall through to paid providers

    # ── 2. ElevenLabs ─────────────────────────────────────────────────────────
    el_key = getattr(settings, "ELEVENLABS_API_KEY", "") or ""
    if el_key:
        el_voice = voice_id or getattr(settings, "ELEVENLABS_VOICE_ID", "pNInz6obpgDQGcFmaJgB")
        try:
            resp = _direct.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{el_voice}",
                headers={"xi-api-key": el_key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
                json={"text": text, "model_id": "eleven_multilingual_v2",
                      "voice_settings": {"stability": 0.45, "similarity_boost": 0.82, "style": 0.15, "use_speaker_boost": True}},
                timeout=30,
            )
            resp.raise_for_status()
            return HttpResponse(resp.content, content_type="audio/mpeg")
        except Exception:
            pass

    # ── 3. OpenAI TTS ─────────────────────────────────────────────────────────
    openai_key = getattr(settings, "OPENAI_API_KEY", "") or ""
    if openai_key:
        try:
            resp = _direct.post(
                "https://api.openai.com/v1/audio/speech",
                headers={"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"},
                json={"model": "tts-1", "voice": "nova", "input": text, "response_format": "mp3"},
                timeout=30,
            )
            resp.raise_for_status()
            return HttpResponse(resp.content, content_type="audio/mpeg")
        except Exception as e:
            return Response({"detail": f"TTS failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"detail": "TTS unavailable"}, status=status.HTTP_502_BAD_GATEWAY)
