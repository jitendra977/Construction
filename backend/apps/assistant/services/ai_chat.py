"""
ai_chat.py — Free AI-powered project-aware chat for साथी.

Provider priority (all free / low-cost):
  1. Groq  — FREE, fast, Llama 3.3-70B  (recommended — get key at console.groq.com)
  2. Google Gemini — FREE generous tier  (get key at aistudio.google.com)
  3. OpenAI — paid fallback
  4. Rule-based parser — always available offline

Set ONE of these in your .env:
    GROQ_API_KEY=gsk_...
    GEMINI_API_KEY=AIza...
    OPENAI_API_KEY=sk-...   (optional, paid)

Context injected into every system prompt:
  - Project name, total budget, spent-to-date
  - Top open tasks (up to 5)
  - Budget category health (over-spend alerts)
  - Material stock summary (low-stock items)
  - Workforce headcount
"""
from __future__ import annotations

import json as _json
import logging
import re
from typing import List, Optional

from django.conf import settings

logger = logging.getLogger(__name__)

# ── System prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """
तपाईं साथी (Sathi) हुनुहुन्छ — HCMS को लागि एक बुद्धिमान AI सहायक। HCMS एक नेपाली निर्माण
परियोजना व्यवस्थापन प्रणाली हो। तपाईं नेपाली निर्माण, बजेट, कार्यबल व्यवस्थापन,
सामग्री खरिद र परियोजना योजनामा विशेषज्ञ हुनुहुन्छ।

हालको परियोजना सन्दर्भ:
{context}

जवाफ दिने नियमहरू:
- सधैं नेपालीमा जवाफ दिनुहोस् (Nepali must be the primary language)
- प्राविधिक शब्दहरू (phase, task, budget, material) अंग्रेजीमा राख्न सकिन्छ
- जवाफ संक्षिप्त र कार्यात्मक राख्नुहोस् (२-४ वाक्य साधारण प्रश्नका लागि)
- नेपाली रुपियाँका लागि Rs. प्रयोग गर्नुहोस्, अंकहरू अल्पविरामसहित लेख्नुहोस् (जस्तै Rs. १,२०,०००)
- अत्यावश्यक समस्याहरू ⚠️ चिह्नले देखाउनुहोस् (बजेट नाघेको, ढिलो काम, कम स्टक)
- समस्या मात्र नभनी समाधान पनि सुझाउनुहोस्
- परियोजनाको डेटा नभएको खण्डमा स्पष्ट रूपमा भन्नुहोस्
- प्रत्येक जवाफको अन्तमा एउटा छोटो follow-up प्रश्न सोध्नुहोस् ताकि कुराकानी जारी रहोस् (जस्तै: "अरु केही जान्नुहुन्छ?", "थप विवरण चाहिन्छ?")

सुझाव नियम (अनिवार्य):
प्रत्येक जवाफको एकदम अन्तमा, एउटा खाली लाइनपछि, ठीक यसरी लेख्नुहोस्:
SUGGEST:["सुझाव १","सुझाव २","सुझाव ३"]
यी ३ वटा छोटा (३-६ शब्द) अर्को कार्यहरू हुनुपर्छ जुन प्रयोगकर्ताले क्लिक गर्न सक्छन्।
नेपालीमा लेख्नुहोस्। उदाहरण:
SUGGEST:["बजेट विवरण हेर्नुस्","नयाँ खर्च थप्नुस्","खुला कामहरू देखाउनुस्"]
SUGGEST:["काम सम्पन्न गर्नुस्","Foundation मा काम थप्नुस्","कम स्टक जाँच्नुस्"]
""".strip()


# ── Parse and strip the SUGGEST line from a reply ────────────────────────────
_SUGGEST_RE = re.compile(r'\nSUGGEST:\s*(\[.*?\])\s*$', re.DOTALL)

def _extract_suggestions(text: str):
    """Return (clean_text, suggestions_list)."""
    m = _SUGGEST_RE.search(text)
    if not m:
        return text.strip(), []
    clean = text[:m.start()].strip()
    try:
        suggestions = _json.loads(m.group(1))
        if isinstance(suggestions, list):
            return clean, [str(s) for s in suggestions[:4]]
    except Exception:
        pass
    return clean, []


# ── Project context builder ───────────────────────────────────────────────────
def _build_context(project_id: Optional[int] = None) -> str:
    parts: List[str] = []

    try:
        from apps.core.models import HouseProject
        qs = HouseProject.objects.all()
        if project_id:
            qs = qs.filter(id=project_id)
        cfg = qs.first()
        if cfg:
            parts.append(f"Project: {cfg.name}  |  Total Budget: Rs. {cfg.total_budget:,.0f}  |  Owner: {cfg.owner_name}")
    except Exception:
        pass

    try:
        from apps.finance.models import BudgetCategory
        cats = BudgetCategory.objects.all()[:6]
        if cats:
            parts.append("Budget:")
            for c in cats:
                spent = float(getattr(c, 'total_spent', 0) or 0)
                alloc = float(c.allocation or 0)
                pct   = int((spent / alloc * 100) if alloc else 0)
                warn  = " ⚠️ OVER" if spent > alloc else ""
                parts.append(f"  {c.name}: Rs.{spent:,.0f}/Rs.{alloc:,.0f} ({pct}%){warn}")
    except Exception:
        pass

    try:
        from apps.tasks.models import Task
        tasks = Task.objects.filter(status__in=["PENDING", "TODO", "IN_PROGRESS"]).order_by("id")[:5]
        if tasks:
            parts.append("Open tasks: " + " | ".join(f"[{t.status}] {t.title}" for t in tasks))
    except Exception:
        pass

    try:
        from apps.resource.models import Material
        low = Material.objects.filter(stock_qty__lte=10).order_by("stock_qty")[:4]
        if low:
            parts.append("Low stock: " + ", ".join(f"{m.name}({m.stock_qty})" for m in low))
    except Exception:
        pass

    try:
        from apps.resource.models import Worker
        n = Worker.objects.filter(is_active=True).count()
        if n:
            parts.append(f"Active workers: {n}")
    except Exception:
        try:
            from apps.workforce.models import WorkforceMember
            n = WorkforceMember.objects.filter(is_active=True).count()
            if n:
                parts.append(f"Active workers: {n}")
        except Exception:
            pass

    return "\n".join(parts) if parts else "No project data available yet."


# ── Providers — all use `requests` (already in requirements, no extra install) ──
import requests as _requests

# Direct session that bypasses ALL system proxy env vars (HTTP_PROXY, HTTPS_PROXY, etc.)
_session = _requests.Session()
_session.trust_env = False


def _call_groq(messages: list, api_key: str, tools: list | None = None, project_id: int | None = None) -> str:
    """Groq — FREE. Uses requests (no openai package needed). Supports tool/function calling."""
    from apps.assistant.services.ai_tools import execute_tool

    model = getattr(settings, "GROQ_MODEL", "llama-3.3-70b-versatile")

    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": 700,
        "temperature": 0.4,
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = "auto"

    resp = _session.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json=payload,
        timeout=25,
    )
    resp.raise_for_status()
    data = resp.json()
    choice = data["choices"][0]
    msg = choice["message"]

    # ── Tool calls? Execute them and get a follow-up response ──
    tool_calls = msg.get("tool_calls") or []
    if tool_calls:
        # Add assistant message with tool_calls to history
        messages = messages + [msg]

        # Execute each tool and append results
        for tc in tool_calls:
            fn_name = tc["function"]["name"]
            try:
                fn_args = _json.loads(tc["function"]["arguments"])
            except Exception:
                fn_args = {}
            result = execute_tool(fn_name, fn_args, project_id)
            logger.info("Tool %s → %s", fn_name, result[:80])

            messages.append({
                "role": "tool",
                "tool_call_id": tc["id"],
                "content": result,
            })

        # Second call — get natural language confirmation
        payload2 = {
            "model": model,
            "messages": messages,
            "max_tokens": 400,
            "temperature": 0.4,
        }
        resp2 = _session.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload2,
            timeout=25,
        )
        resp2.raise_for_status()
        return resp2.json()["choices"][0]["message"]["content"].strip()

    # Plain text response (no tool calls)
    return (msg.get("content") or "").strip()


def _call_gemini(messages: list, api_key: str) -> str:
    """Google Gemini — FREE generous tier. Uses requests."""
    system_text = next((m["content"] for m in messages if m["role"] == "system"), "")
    history = [
        {"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
        for m in messages if m["role"] in ("user", "assistant")
    ]
    model = getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    resp = _session.post(
        url,
        json={
            "system_instruction": {"parts": [{"text": system_text}]},
            "contents": history,
            "generationConfig": {"maxOutputTokens": 500, "temperature": 0.5},
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_openai(messages: list, api_key: str) -> str:
    """OpenAI — paid fallback. Uses requests."""
    model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
    resp = _session.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": model,
            "messages": messages,
            "max_tokens": 500,
            "temperature": 0.5,
        },
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ── Main entry point ──────────────────────────────────────────────────────────
def ai_chat(
    message: str,
    history: List[dict] | None = None,
    project_id: int | None = None,
    language: str = "en",
    provider: str = "auto",   # "auto" | "groq" | "gemini" | "openai"
) -> dict:
    """
    Returns:
        {message, intent, source, data, suggestions}

    provider:
        "auto"   — try Groq → Gemini → OpenAI in order
        "groq"   — force Groq; fall back to auto on failure
        "gemini" — force Gemini; fall back to auto on failure
        "openai" — force OpenAI; fall back to auto on failure
    """
    history = history or []
    context = _build_context(project_id)

    system_msg = {"role": "system", "content": SYSTEM_PROMPT.format(context=context)}
    conv = [system_msg]
    for h in history[-10:]:
        if h.get("role") in ("user", "assistant") and h.get("content"):
            conv.append({"role": h["role"], "content": h["content"]})
    conv.append({"role": "user", "content": message})

    from apps.assistant.services.ai_tools import TOOLS

    groq_key   = getattr(settings, "GROQ_API_KEY",   "") or ""
    gemini_key = getattr(settings, "GEMINI_API_KEY", "") or ""
    openai_key = getattr(settings, "OPENAI_API_KEY", "") or ""

    _errors = []   # collect failure reasons for diagnostics

    def try_groq():
        if not groq_key:
            _errors.append("Groq: key missing")
            return None
        try:
            raw = _call_groq(conv, groq_key, tools=TOOLS, project_id=project_id)
            reply, suggestions = _extract_suggestions(raw)
            return {"message": reply, "intent": None, "source": "groq", "data": None, "suggestions": suggestions}
        except Exception as e:
            msg = f"Groq: {type(e).__name__}: {str(e)[:120]}"
            logger.warning(msg)
            _errors.append(msg)
            return None

    def try_gemini():
        if not gemini_key:
            _errors.append("Gemini: key missing")
            return None
        try:
            raw = _call_gemini(conv, gemini_key)
            reply, suggestions = _extract_suggestions(raw)
            return {"message": reply, "intent": None, "source": "gemini", "data": None, "suggestions": suggestions}
        except Exception as e:
            msg = f"Gemini: {type(e).__name__}: {str(e)[:120]}"
            logger.warning(msg)
            _errors.append(msg)
            return None

    def try_openai():
        if not openai_key:
            _errors.append("OpenAI: key missing")
            return None
        try:
            raw = _call_openai(conv, openai_key)
            reply, suggestions = _extract_suggestions(raw)
            return {"message": reply, "intent": None, "source": "openai", "data": None, "suggestions": suggestions}
        except Exception as e:
            msg = f"OpenAI: {type(e).__name__}: {str(e)[:120]}"
            logger.warning(msg)
            _errors.append(msg)
            return None

    # ── Dispatch by provider preference ──────────────────────────────────────
    p = (provider or "auto").lower()

    if p == "groq":
        result = try_groq() or try_gemini() or try_openai()
    elif p == "gemini":
        result = try_gemini() or try_groq() or try_openai()
    elif p == "openai":
        result = try_openai() or try_groq() or try_gemini()
    else:
        # auto: Groq → Gemini → OpenAI
        result = try_groq() or try_gemini() or try_openai()

    if result:
        return result
    # All providers failed — pass error details to fallback so UI can show them
    logger.error("All AI providers failed. Errors: %s", _errors)
    return _rule_fallback(message, _errors)


def _rule_fallback(message: str, errors: list | None = None) -> dict:
    from apps.assistant.services.parser import parse
    from apps.assistant.services.dispatcher import dispatch
    result = parse(message)
    text   = dispatch(result)

    # Build a diagnostic message so user knows what went wrong
    if errors:
        # Simplify the first error for display
        first = errors[0] if errors else ""
        if "ProxyError" in first or "proxy" in first.lower():
            diag = "⚠️ Proxy error — backend server पुनः सुरु गर्नुस् (restart Django)।"
        elif "ConnectionError" in first or "Connection" in first:
            diag = "⚠️ Network error — internet जडान जाँच्नुस्।"
        elif "key missing" in first:
            diag = "⚠️ API key छैन — .env मा GROQ_API_KEY थप्नुस्।"
        elif "401" in first or "403" in first:
            diag = "⚠️ API key अमान्य — .env मा सही key राख्नुस्।"
        elif "429" in first:
            diag = "⚠️ Rate limit — केही मिनेट पछि फेरि प्रयास गर्नुस्।"
        else:
            diag = f"⚠️ AI जडान असफल — {first[:80]}"
    else:
        diag = None

    fallback_text = text or (diag or "माफ गर्नुस्, AI सेवा अनुपलब्ध।")

    return {
        "message": fallback_text,
        "intent":  result.intent,
        "source":  "fallback",
        "data":    {"errors": errors} if errors else (result.entities or None),
        "suggestions": ["बजेट स्थिति जाँच्नुस्", "खुला कामहरू देखाउनुस्", "नयाँ खर्च थप्नुस्"],
    }
