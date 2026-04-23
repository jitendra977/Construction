"""
Intent parser for साथी — simple keyword/regex matcher with Nepali
+ Nepali-English (Romanized) support. Pluggable: external NLU can be
swapped in by adding a new parser to `_PARSERS` and selecting via
`settings.ASSISTANT_PARSER`.

The default parser is deliberately small and deterministic so it
works offline and is easy to extend.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Dict, List, Tuple

from django.conf import settings


# ─── Intent vocabulary ───────────────────────────────────────────────
# Each intent maps to a list of (weighted, phrase) pairs. The parser
# picks the intent whose matching phrases sum to the highest weight.
INTENT_VOCAB: Dict[str, List[Tuple[float, str]]] = {
    "STOCK_CHECK": [
        (1.0, "कति"), (1.0, "stock"), (1.0, "मौज्दात"),
        (1.2, "कति बाँकी"), (1.2, "kati baki"), (1.0, "how much"),
        (1.0, "baki"), (1.2, "कति ल्याइयो"),
    ],
    "BUDGET_CHECK": [
        (1.2, "बजेट"), (1.0, "budget"), (1.2, "कति खर्च"),
        (1.0, "kati kharcha"), (1.0, "खर्च कति"), (1.0, "spend"),
        (1.2, "कति पैसा"),
    ],
    "TASK_ADD": [
        (1.2, "काम थप"), (1.0, "काम राख"), (1.2, "task add"),
        (1.0, "add task"), (1.0, "नयाँ काम"), (1.0, "naya kaam"),
    ],
    "TASK_COMPLETE": [
        (1.2, "काम सकियो"), (1.0, "काम भयो"), (1.0, "complete task"),
        (1.0, "sakiyo"), (1.2, "भयो"),
    ],
    "EXPENSE_ADD": [
        (1.2, "खर्च राख"), (1.2, "add expense"), (1.0, "paisa diyo"),
        (1.0, "तिरेँ"), (1.0, "तिरियो"),
    ],
    "NEXT_STEP": [
        (1.2, "अब के गर्ने"), (1.2, "ab ke garne"), (1.2, "what next"),
        (1.0, "नयाँ phase"), (1.0, "agadi"),
    ],
    "HELP": [
        (1.0, "help"), (1.0, "मदत"), (1.0, "साथी"), (1.0, "sathi"),
    ],
}

# Numeric entity extractors — in Nepali and Romanized
_NUM_RE = re.compile(r"(\d+(?:\.\d+)?)")
# Known materials (a tiny seed — admins can add more via KnownPhrase)
_MATERIAL_HINTS = {
    "सिमेन्ट": "cement", "cement": "cement", "siment": "cement",
    "बालुवा": "sand", "sand": "sand", "baluwa": "sand",
    "इँट": "brick", "इट": "brick", "brick": "brick", "eet": "brick",
    "गिट्टी": "aggregate", "gitti": "aggregate", "aggregate": "aggregate",
    "छड": "rebar", "chhad": "rebar", "rebar": "rebar",
}


@dataclass
class ParseResult:
    intent: str
    entities: Dict
    confidence: float


def _score_intent(text: str) -> Tuple[str, float]:
    t = text.lower()
    best_intent = "UNKNOWN"
    best_score = 0.0
    for intent, phrases in INTENT_VOCAB.items():
        score = sum(w for w, p in phrases if p.lower() in t)
        if score > best_score:
            best_score = score
            best_intent = intent
    # Merge in KnownPhrase table entries (kept cheap — small table)
    try:
        from apps.assistant.models import KnownPhrase
        for kp in KnownPhrase.objects.filter(is_active=True):
            if kp.phrase.lower() in t:
                if kp.intent == best_intent:
                    best_score += kp.weight
                elif kp.weight > best_score:
                    best_score = kp.weight
                    best_intent = kp.intent
    except Exception:
        # Avoid breaking if the table doesn't exist yet (migrations)
        pass
    # Normalize to 0..1 confidence assuming ~3 hits is strong
    conf = min(1.0, best_score / 3.0)
    return best_intent, conf


def _extract_entities(text: str) -> Dict:
    entities: Dict = {}
    numbers = _NUM_RE.findall(text)
    if numbers:
        try:
            entities["numbers"] = [float(n) for n in numbers]
            entities["number"] = entities["numbers"][0]
        except ValueError:
            pass

    t = text.lower()
    for hint, canonical in _MATERIAL_HINTS.items():
        if hint.lower() in t:
            entities["material"] = canonical
            break
    return entities


def parse_default(text: str) -> ParseResult:
    intent, confidence = _score_intent(text or "")
    return ParseResult(
        intent=intent,
        entities=_extract_entities(text or ""),
        confidence=round(confidence, 3),
    )


_PARSERS = {"default": parse_default}


def parse(text: str) -> ParseResult:
    backend = getattr(settings, "ASSISTANT_PARSER", "default")
    fn = _PARSERS.get(backend, parse_default)
    return fn(text)
