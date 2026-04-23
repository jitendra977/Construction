"""
Pluggable photo analyzer.

Design
------
The backend talks to a single `BasePhotoAnalyzer` interface. The concrete
analyzer is selected at runtime via `settings.PHOTO_INTEL_ANALYZER`:

    "heuristic"       → HeuristicAnalyzer      (pure-Python, zero external calls)
    "google_vision"   → GoogleVisionAnalyzer   (requires GOOGLE_VISION_API_KEY)
    "openai_vision"   → OpenAIVisionAnalyzer   (requires OPENAI_API_KEY)

The default is `"heuristic"` so the project works out-of-the-box with no
secrets. Swap analyzers via env var without touching code.

Public entry point
------------------
`analyze_task_media(media)` — runs the configured analyzer against a
`tasks.TaskMedia` instance and upserts the resulting `PhotoAnalysis`.
"""
from __future__ import annotations

import io
import logging
import os
import random
import statistics
from dataclasses import dataclass, field
from typing import List, Optional

from django.conf import settings
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────
#  Result dataclass — analyzer-agnostic shape
# ─────────────────────────────────────────────────────────────────────
@dataclass
class AnalysisResult:
    detected_phase_key: str = "UNKNOWN"
    detected_phase_label: str = "Unknown"
    phase_confidence: float = 0.0
    tags: List[str] = field(default_factory=list)
    detected_objects: List[dict] = field(default_factory=list)
    quality_score: float = 0.0
    brightness: float = 0.0
    dominant_colors: List[str] = field(default_factory=list)
    analyzer_name: str = "unknown"
    raw_response: dict = field(default_factory=dict)


# ─────────────────────────────────────────────────────────────────────
#  Base
# ─────────────────────────────────────────────────────────────────────
class BasePhotoAnalyzer:
    """Interface every analyzer implementation must follow."""

    name: str = "base"

    def analyze(self, image_bytes: bytes, filename: str = "") -> AnalysisResult:
        raise NotImplementedError


# ─────────────────────────────────────────────────────────────────────
#  Heuristic (default) — works without any external API
# ─────────────────────────────────────────────────────────────────────
class HeuristicAnalyzer(BasePhotoAnalyzer):
    """
    Pure-Python analyzer using Pillow + keyword heuristics.

    Strategy
    --------
    1. Decode image with Pillow.
    2. Compute brightness, dominant colors, resolution → `quality_score`.
    3. Use filename / description keywords + color heuristics to guess phase.
       (Rebar/shuttering photos tend to be grey + brown; brickwork has red-orange;
        plastering is grey-beige; finishing is often lighter.)
    4. Return a confidence score that reflects how strong the signal is.

    This is intentionally simple but deterministic, so tests can assert on it,
    and it provides a useful baseline until a real ML backend is wired up.
    """

    name = "heuristic"

    # Rough phase → (dominant HSV hue range, saturation hint)
    # Used only as a weak secondary signal.
    _PHASE_COLOR_HINTS = {
        "FOUNDATION": {"grey": 0.4, "brown": 0.3},
        "COLUMN": {"grey": 0.5, "brown": 0.2},
        "SLAB": {"grey": 0.6, "brown": 0.1},
        "BRICKWORK": {"red": 0.5, "orange": 0.3},
        "PLASTERING": {"grey": 0.4, "beige": 0.4},
        "TILING": {"white": 0.4, "grey": 0.2},
        "PAINTING": {"white": 0.3, "blue": 0.2, "yellow": 0.2},
    }

    def analyze(self, image_bytes: bytes, filename: str = "") -> AnalysisResult:
        from PIL import Image, ImageStat
        from .color_utils import dominant_color_names, hsv_histogram
        from apps.photo_intel.constants import (
            PHASE_KEYWORDS,
            PHASE_LABEL,
            PHASE_UNKNOWN,
        )

        result = AnalysisResult(analyzer_name=self.name)

        try:
            img = Image.open(io.BytesIO(image_bytes))
            img = img.convert("RGB")
        except Exception as e:  # noqa: BLE001
            logger.warning("HeuristicAnalyzer: failed to decode image: %s", e)
            result.raw_response = {"error": f"decode_failed: {e}"}
            return result

        # ── Brightness ─────────────────────────────────────────────
        stat = ImageStat.Stat(img)
        brightness = sum(stat.mean[:3]) / (3 * 255.0)  # 0..1
        result.brightness = round(brightness, 3)

        # ── Resolution-based quality ───────────────────────────────
        w, h = img.size
        mp = (w * h) / 1_000_000
        resolution_score = min(1.0, mp / 2.0)  # 2MP = perfect
        brightness_score = 1.0 - abs(brightness - 0.5) * 2  # closer to 0.5 is better
        result.quality_score = round(
            (resolution_score * 0.6 + brightness_score * 0.4), 3
        )

        # ── Dominant colors ────────────────────────────────────────
        palette = dominant_color_names(img, k=5)
        result.dominant_colors = palette
        histogram = hsv_histogram(img)

        # ── Phase classification — keyword path ────────────────────
        needle = (filename or "").lower()
        scores = {k: 0.0 for k in PHASE_KEYWORDS}
        for key, words in PHASE_KEYWORDS.items():
            for w_ in words:
                if w_ in needle:
                    scores[key] += 1.0

        # ── Phase classification — color hint path ─────────────────
        for phase_key, colors in self._PHASE_COLOR_HINTS.items():
            for colour, weight in colors.items():
                scores[phase_key] += weight * histogram.get(colour, 0.0)

        # Pick best
        best_key = max(scores, key=scores.get)
        best_score = scores[best_key]
        total = sum(scores.values()) or 1.0
        confidence = round(min(0.95, best_score / total), 3)

        if confidence < 0.15:
            best_key = PHASE_UNKNOWN
            confidence = 0.0

        result.detected_phase_key = best_key
        result.detected_phase_label = PHASE_LABEL.get(best_key, best_key)
        result.phase_confidence = confidence

        # ── Tags: combine dominant colors + any matched keywords ───
        tags: List[str] = []
        for key, words in PHASE_KEYWORDS.items():
            for w_ in words:
                if w_ in needle and w_ not in tags:
                    tags.append(w_)
        # Add a keyword tag for the best phase for downstream display
        if best_key != PHASE_UNKNOWN:
            tags.append(PHASE_LABEL[best_key].lower())
        tags.extend(palette[:2])  # top-2 colour tags
        result.tags = tags[:10]

        result.raw_response = {
            "scores": scores,
            "histogram": histogram,
            "resolution_mp": round(mp, 2),
            "width": w,
            "height": h,
        }
        return result


# ─────────────────────────────────────────────────────────────────────
#  Google Vision — optional adapter (lazy import)
# ─────────────────────────────────────────────────────────────────────
class GoogleVisionAnalyzer(BasePhotoAnalyzer):
    name = "google_vision"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GOOGLE_VISION_API_KEY", "")
        if not self.api_key:
            raise RuntimeError(
                "GoogleVisionAnalyzer requires GOOGLE_VISION_API_KEY env var."
            )

    def analyze(self, image_bytes: bytes, filename: str = "") -> AnalysisResult:
        import base64
        import requests

        from apps.photo_intel.constants import PHASE_KEYWORDS, PHASE_LABEL, PHASE_UNKNOWN

        result = AnalysisResult(analyzer_name=self.name)

        url = f"https://vision.googleapis.com/v1/images:annotate?key={self.api_key}"
        body = {
            "requests": [
                {
                    "image": {"content": base64.b64encode(image_bytes).decode("ascii")},
                    "features": [
                        {"type": "LABEL_DETECTION", "maxResults": 15},
                        {"type": "OBJECT_LOCALIZATION", "maxResults": 10},
                    ],
                }
            ]
        }
        try:
            resp = requests.post(url, json=body, timeout=20)
            resp.raise_for_status()
            data = resp.json()["responses"][0]
        except Exception as e:  # noqa: BLE001
            logger.error("GoogleVisionAnalyzer failed: %s", e)
            result.raw_response = {"error": str(e)}
            return result

        labels = [l["description"].lower() for l in data.get("labelAnnotations", [])]
        objects = [
            {
                "label": o["name"].lower(),
                "confidence": o.get("score", 0.0),
            }
            for o in data.get("localizedObjectAnnotations", [])
        ]
        result.tags = labels[:10]
        result.detected_objects = objects
        result.raw_response = data

        # Score phases by label keyword overlap
        scores = {k: 0.0 for k in PHASE_KEYWORDS}
        for key, words in PHASE_KEYWORDS.items():
            for w_ in words:
                for label in labels:
                    if w_ in label:
                        scores[key] += 1.0
        best_key = max(scores, key=scores.get) if scores else PHASE_UNKNOWN
        best_score = scores.get(best_key, 0.0)
        total = sum(scores.values()) or 1.0
        result.detected_phase_key = best_key if best_score > 0 else PHASE_UNKNOWN
        result.detected_phase_label = PHASE_LABEL.get(result.detected_phase_key, "Unknown")
        result.phase_confidence = round(min(0.95, best_score / total), 3) if best_score else 0.0
        return result


# ─────────────────────────────────────────────────────────────────────
#  OpenAI Vision — optional adapter (lazy import)
# ─────────────────────────────────────────────────────────────────────
class OpenAIVisionAnalyzer(BasePhotoAnalyzer):
    name = "openai_vision"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        if not self.api_key:
            raise RuntimeError(
                "OpenAIVisionAnalyzer requires OPENAI_API_KEY env var."
            )

    def analyze(self, image_bytes: bytes, filename: str = "") -> AnalysisResult:
        import base64
        import json
        import requests

        from apps.photo_intel.constants import PHASE_KEYS, PHASE_LABEL, PHASE_UNKNOWN

        result = AnalysisResult(analyzer_name=self.name)
        url = "https://api.openai.com/v1/chat/completions"
        prompt = (
            "You are a construction-site photo analyst. "
            "Classify this image into exactly ONE of the following phases and "
            "list visible objects & a quality score (0..1).\n\n"
            f"Phases: {', '.join(PHASE_KEYS)}.\n\n"
            'Respond in JSON: {"phase_key": "...", "confidence": 0.0-1.0, '
            '"tags": [...], "quality_score": 0.0-1.0}. '
            "No prose outside JSON."
        )
        b64 = base64.b64encode(image_bytes).decode("ascii")
        body = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                        },
                    ],
                }
            ],
            "response_format": {"type": "json_object"},
        }
        headers = {"Authorization": f"Bearer {self.api_key}"}
        try:
            resp = requests.post(url, json=body, headers=headers, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
        except Exception as e:  # noqa: BLE001
            logger.error("OpenAIVisionAnalyzer failed: %s", e)
            result.raw_response = {"error": str(e)}
            return result

        key = (parsed.get("phase_key") or PHASE_UNKNOWN).upper()
        if key not in PHASE_KEYS:
            key = PHASE_UNKNOWN
        result.detected_phase_key = key
        result.detected_phase_label = PHASE_LABEL.get(key, "Unknown")
        result.phase_confidence = float(parsed.get("confidence", 0.0))
        result.tags = parsed.get("tags", [])[:10]
        result.quality_score = float(parsed.get("quality_score", 0.0))
        result.raw_response = parsed
        return result


# ─────────────────────────────────────────────────────────────────────
#  Factory
# ─────────────────────────────────────────────────────────────────────
_ANALYZER_REGISTRY = {
    "heuristic": HeuristicAnalyzer,
    "google_vision": GoogleVisionAnalyzer,
    "openai_vision": OpenAIVisionAnalyzer,
}


def get_analyzer() -> BasePhotoAnalyzer:
    """
    Return an analyzer instance per settings.PHOTO_INTEL_ANALYZER.
    Falls back to HeuristicAnalyzer on any error so the pipeline never hangs
    because of configuration issues.
    """
    configured = getattr(settings, "PHOTO_INTEL_ANALYZER", "heuristic")
    cls = _ANALYZER_REGISTRY.get(configured, HeuristicAnalyzer)
    try:
        return cls()
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "Analyzer '%s' unavailable (%s). Falling back to HeuristicAnalyzer.",
            configured, e,
        )
        return HeuristicAnalyzer()


# ─────────────────────────────────────────────────────────────────────
#  Public orchestration
# ─────────────────────────────────────────────────────────────────────
def analyze_task_media(media):
    """
    Main entry point — run analysis for a TaskMedia row and upsert PhotoAnalysis.
    Safe to call synchronously (signal handler) or asynchronously (Celery task).
    """
    from apps.photo_intel.models import PhotoAnalysis
    from apps.photo_intel.services.phase_mapper import resolve_task_phase_key
    from apps.photo_intel.constants import PHASE_UNKNOWN

    # Idempotent — get or create
    analysis, _ = PhotoAnalysis.objects.get_or_create(media=media)

    # Non-image media?
    if media.media_type != "IMAGE":
        analysis.status = "SKIPPED"
        analysis.error_message = f"media_type={media.media_type}"
        analysis.save()
        return analysis

    analysis.status = "PROCESSING"
    analysis.save(update_fields=["status"])

    try:
        media.file.open("rb")
        image_bytes = media.file.read()
    except Exception as e:  # noqa: BLE001
        analysis.status = "FAILED"
        analysis.error_message = f"read_error: {e}"
        analysis.save()
        return analysis
    finally:
        try:
            media.file.close()
        except Exception:
            pass

    analyzer = get_analyzer()
    try:
        result: AnalysisResult = analyzer.analyze(
            image_bytes, filename=media.file.name or ""
        )
    except Exception as e:  # noqa: BLE001
        logger.exception("Analyzer crashed")
        analysis.status = "FAILED"
        analysis.error_message = str(e)
        analysis.analyzer_name = analyzer.name
        analysis.save()
        return analysis

    # Phase-match verdict
    task_phase_key = resolve_task_phase_key(media.task)
    if task_phase_key == PHASE_UNKNOWN:
        match = "NO_PHASE"
    elif result.detected_phase_key == PHASE_UNKNOWN or result.phase_confidence < 0.3:
        match = "INCONCLUSIVE"
    elif result.detected_phase_key == task_phase_key:
        match = "MATCH"
    else:
        match = "MISMATCH"

    # Persist
    analysis.status = "COMPLETED"
    analysis.detected_phase_key = result.detected_phase_key
    analysis.detected_phase_label = result.detected_phase_label
    analysis.phase_confidence = result.phase_confidence
    analysis.phase_match = match
    analysis.tags = result.tags
    analysis.detected_objects = result.detected_objects
    analysis.quality_score = result.quality_score
    analysis.brightness = result.brightness
    analysis.dominant_colors = result.dominant_colors
    analysis.analyzer_name = result.analyzer_name
    analysis.raw_response = result.raw_response
    analysis.error_message = ""
    analysis.save()

    return analysis
