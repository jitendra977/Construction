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
_DEVANAGARI_TO_ASCII = str.maketrans("०१२३४५६७८९", "0123456789")
_NE_FINAL_VERBS = r'(सक्छ|सकिन्छ|हुन्छ|चाहिन्छ|मिल्छ|गरिन्छ|बनाइन्छ|देखिन्छ)'

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

def _normalize_digit_string(s: str) -> str:
    # Convert Devanagari digits to ASCII so int() is deterministic.
    return (s or "").translate(_DEVANAGARI_TO_ASCII)

def _expand_common_tokens(text: str, lang: str = "ne") -> str:
    # Keep technical terms readable and avoid merged pronunciation.
    repl = [
        (r'\bAPI\b', 'ए पी आई' if lang == "ne" else 'A P I'),
        (r'\bID\b', 'आइ डी' if lang == "ne" else 'I D'),
        (r'\bURL\b', 'यू आर एल' if lang == "ne" else 'U R L'),
        (r'\bUI\b', 'यू आई' if lang == "ne" else 'U I'),
        (r'\bUX\b', 'यू एक्स' if lang == "ne" else 'U X'),
        (r'\bSQL\b', 'एस क्यू एल' if lang == "ne" else 'S Q L'),
        (r'\bNPR\b', 'नेपाली रुपैयाँ' if lang == "ne" else 'Nepalese rupees'),
        (r'\bkg\b', 'किलोग्राम' if lang == "ne" else 'kilograms'),
        (r'\bg\b', 'ग्राम' if lang == "ne" else 'grams'),
        (r'\bkm\b', 'किलोमिटर' if lang == "ne" else 'kilometers'),
        (r'\bm2\b', 'वर्ग मिटर' if lang == "ne" else 'square meters'),
        (r'\bm3\b', 'घन मिटर' if lang == "ne" else 'cubic meters'),
        (r'\bcm\b', 'सेन्टिमिटर' if lang == "ne" else 'centimeters'),
        (r'\bmm\b', 'मिलिमिटर' if lang == "ne" else 'millimeters'),
        (r'\bhrs?\b', 'घण्टा' if lang == "ne" else 'hours'),
        (r'\bmins?\b', 'मिनेट' if lang == "ne" else 'minutes'),
        (r'\bsecs?\b', 'सेकेन्ड' if lang == "ne" else 'seconds'),
    ]
    for pat, val in repl:
        text = re.sub(pat, val, text, flags=re.IGNORECASE)
    return text

def _normalize_pauses(text: str, lang: str = "ne") -> str:
    # Explicit, natural pauses per punctuation rules.
    text = text.replace("\r\n", "\n")
    if lang == "ne":
        # Prosody: lightly hold final syllable on common Nepali sentence-ending verbs.
        # Examples: "सकिन्छ।" -> "सकिन्छ्…"
        text = re.sub(rf'{_NE_FINAL_VERBS}\s*:', r'\1्… :', text)
        text = re.sub(rf'{_NE_FINAL_VERBS}\s*।', r'\1्… ।', text)
        text = re.sub(rf'{_NE_FINAL_VERBS}\s*\.', r'\1्… .', text)
        text = re.sub(rf'{_NE_FINAL_VERBS}\s*$', r'\1्…', text)

    # Nepali danda should act like sentence punctuation, not spoken as a symbol.
    text = text.replace("।", ". ")
    text = re.sub(r'\n{2,}', '\n\n', text)
    text = re.sub(r'([,:;])\s*', r'\1 ', text)
    text = re.sub(r'([.?!])\s*', r'\1 ', text)
    # Keep longer paragraph pause by preserving blank lines
    text = text.replace("\n\n", " …\n\n")
    if lang == "ne":
        # End-of-sentence completion pause (0.5–1s feel) and medium pause after headings.
        text = re.sub(r'\.\s*', '… . ', text)
        text = re.sub(r':\s*', '… : ', text)
    return text

def _prepare_tts(text: str, lang: str = 'ne') -> str:
    """Normalize text for clearer Nepali/English speech with punctuation pauses."""
    # Strip markdown, keep content.
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    text = re.sub(r'\*(.+?)\*',     r'\1', text)
    text = re.sub(r'#+\s*',         '',    text)
    text = re.sub(r'[✅⚠️🤖📊📋➕🏗️📈🔊✓`~|<>#@$^&*=+{}[\]\\]', ' ', text)
    text = re.sub(r'\[.*?\]\(.*?\)', lambda m: m.group(0).split(']')[0][1:], text)  # [label](url) → label
    text = text.replace('_', ' ')

    # Dates and time (read naturally)
    if lang == 'ne':
        text = re.sub(r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b', r'\1 साल \2 महिना \3 गते', text)
        text = re.sub(r'\b(\d{1,2}):(\d{2})\s*([AaPp][Mm])\b', r'\1 बजेर \2 मिनेट \3', text)
    else:
        text = re.sub(r'\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b', r'\1-\2-\3', text)
        text = re.sub(r'\b(\d{1,2}):(\d{2})\s*([AaPp][Mm])\b', r'\1 \2 \3', text)

    # Currency and percentage (supports ASCII + Devanagari digits)
    # User-preferred style: "रु एक लाख"
    text = re.sub(r'Rs\.?\s*', 'रु ', text, flags=re.IGNORECASE)
    # Only normalize standalone "रु." token.
    text = re.sub(r'(^|[\s(])रु\.?\s*', r'\1रु ', text)
    text = re.sub(r'₹\s*', 'रु ' if lang == 'ne' else 'rupees ', text)
    text = re.sub(r'([0-9०-९])\s*%', r'\1 प्रतिशत' if lang == 'ne' else r'\1 percent', text)

    if lang == 'ne':
        # Convert currency amounts first.
        # Target format: "रु <number in words>"
        # Example: Rs. 200,000 -> "रु दुई लाख"
        def _replace_currency_num(m):
            raw = _normalize_digit_string(m.group(1)).replace(",", "")
            try:
                return f"रु {_num_to_nepali(int(raw))}"
            except ValueError:
                return m.group(0)

        text = re.sub(
            r'रु\s*([0-9०-९][0-9०-९,]*)',
            _replace_currency_num,
            text,
            flags=re.IGNORECASE,
        )

        # Numbers with commas/digits → Nepali words.
        def _replace(m):
            raw = _normalize_digit_string(m.group(0)).replace(',', '')
            try:
                return _num_to_nepali(int(raw))
            except ValueError:
                return raw
        text = re.sub(r'[0-9०-९,]+', _replace, text)
    else:
        # Keep digits in English but normalize grouped numbers.
        text = re.sub(r'(\d),(\d)', r'\1\2', text)

    # Safety: never speak numeric commas in any language.
    text = re.sub(r'([0-9०-९]),([0-9०-९])', r'\1\2', text)

    # Read IDs/model names clearly: split separators.
    text = re.sub(r'([A-Za-z0-9])[-_/]([A-Za-z0-9])', r'\1 \2', text)
    text = _expand_common_tokens(text, lang)
    text = _normalize_pauses(text, lang)

    # Collapse whitespace
    text = re.sub(r'\n', ' ', text)
    text = re.sub(r'\s{2,}', ' ', text)
    text = text.strip()
    # Ensure a natural trailing pause at sentence end.
    if text and text[-1] not in ".?!":
        text += "."
    return text

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
    permission_classes = [IsAuthenticated]
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
    message = str(request.data.get("message") or "").strip()
    raw_history = request.data.get("history") or []
    project_id = request.data.get("project_id")
    language = str(request.data.get("language", "ne") or "ne").lower()
    provider = str(request.data.get("provider", "auto") or "auto").lower()

    if not message:
        return Response({"detail": "message is required."}, status=status.HTTP_400_BAD_REQUEST)

    if provider not in {"auto", "groq", "gemini", "openai"}:
        provider = "auto"
    if language not in {"ne", "en"}:
        language = "ne"

    # Normalize client history to prevent malformed payloads from breaking chat.
    history = []
    if isinstance(raw_history, list):
        for item in raw_history[-20:]:
            if not isinstance(item, dict):
                continue
            role = item.get("role")
            content = str(item.get("content") or "").strip()
            if role not in {"user", "assistant"} or not content:
                continue
            history.append({"role": role, "content": content[:4000]})

    if project_id in ("", "null", "undefined"):
        project_id = None
    try:
        project_id = int(project_id) if project_id is not None else None
    except (TypeError, ValueError):
        project_id = None

    from .services.ai_chat import ai_chat
    try:
        result = ai_chat(
            message=message,
            history=history,
            project_id=project_id,
            language=language,
            provider=provider,
        )
    except Exception as exc:
        # Never fail the endpoint with 500 for user chat.
        result = {
            "message": "⚠️ AI सेवा अहिले उपलब्ध छैन। केही समयपछि फेरि प्रयास गर्नुहोस्।",
            "intent": "UNKNOWN",
            "source": "fallback",
            "data": {"error": str(exc)[:160]},
            "suggestions": ["फेरि प्रयास गर्नुहोस्", "खुला कामहरू देखाउनुस्", "बजेट स्थिति जाँच्नुस्"],
        }

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

        # Pick a neural voice based on language.
        # Mixed Nepali + English text benefits from multilingual EN voice.
        has_nep = bool(re.search(r'[ऀ-ॿ]', spoken_text))
        has_eng = bool(re.search(r'[A-Za-z]', spoken_text))
        is_mixed = has_nep and has_eng

        if not voice_id:
            if lang == "ne" and is_mixed:
                voice_id = "en-US-AvaMultilingualNeural"
            else:
                voice_id = "ne-NP-HemkalaNeural" if lang == "ne" else "en-US-JennyNeural"

        async def _speak():
            # Warm, clear, professional pacing (clarity over speed).
            rate = "-8%" if is_mixed else "-12%"
            communicate = edge_tts.Communicate(
                spoken_text,
                voice_id,
                rate=rate,
                pitch="+0Hz",
                volume="+0%",
            )
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
                json={"model": "tts-1-hd", "voice": "nova", "input": spoken_text, "response_format": "mp3", "speed": 0.9},
                timeout=30,
            )
            resp.raise_for_status()
            return HttpResponse(resp.content, content_type="audio/mpeg")
        except Exception as e:
            return Response({"detail": f"TTS failed: {e}"}, status=status.HTTP_502_BAD_GATEWAY)

    return Response({"detail": "TTS unavailable"}, status=status.HTTP_502_BAD_GATEWAY)
