"""
Intent dispatcher — takes a ParseResult and returns a human-readable
response string (Nepali by default), optionally executing a side-effect.

This module is where we wire intents into concrete HCMS actions. Each
handler is small and pure, so they're easy to unit-test.
"""
from __future__ import annotations

from decimal import Decimal
from typing import Dict

from django.db.models import Sum

from apps.assistant.services.parser import ParseResult


def _fmt_rs(n) -> str:
    try:
        return f"Rs. {Decimal(n):,.0f}"
    except Exception:
        return f"Rs. {n}"


# ─── Intent handlers ─────────────────────────────────────────────────
def _handle_stock_check(entities: Dict) -> str:
    from apps.resource.models import Material
    material_key = entities.get("material")
    qs = Material.objects.all()
    if material_key:
        qs = qs.filter(name__icontains=material_key)
    qs = qs[:3]
    if not qs:
        return "सामग्री फेला परेन। कृपया नाम प्रस्ट भन्नुहोस्।"
    lines = [
        f"{m.name}: {m.stock_qty} {m.get_unit_display()} बाँकी"
        for m in qs
    ]
    return " · ".join(lines)


def _handle_budget_check(entities: Dict) -> str:
    from apps.finance.models import BudgetCategory
    cats = BudgetCategory.objects.all()[:5]
    if not cats:
        return "कुनै बजेट कोटि छैन।"
    parts = []
    for c in cats:
        spent = c.total_spent
        parts.append(f"{c.name}: {_fmt_rs(spent)} / {_fmt_rs(c.allocation)}")
    return " · ".join(parts)


def _handle_next_step() -> str:
    from apps.tasks.models import Task
    # Oldest open task is "next"
    t = Task.objects.filter(status__in=["TODO", "IN_PROGRESS"]).order_by("id").first()
    if not t:
        return "अहिले कुनै सक्रिय काम छैन। नयाँ phase सुरु गर्ने समय!"
    return f"अब गर्ने: {t.title}"


def _handle_help() -> str:
    return (
        "म साथी हुँ। तपाईं भन्न सक्नुहुन्छ: "
        "'सिमेन्ट कति बाँकी', 'बजेट कति', 'अब के गर्ने', 'काम सकियो'।"
    )


_HANDLERS = {
    "STOCK_CHECK": _handle_stock_check,
    "BUDGET_CHECK": lambda ents: _handle_budget_check(ents),
    "NEXT_STEP": lambda ents: _handle_next_step(),
    "HELP": lambda ents: _handle_help(),
}


def _handle_task_add(entities: Dict) -> str:
    title = (entities.get("title") or "").strip()
    phase = (entities.get("phase_name") or "").strip()
    priority = (entities.get("priority") or "").strip()

    missing = []
    if not title:
        missing.append("title")
    if not phase:
        missing.append("phase")
    if not priority:
        missing.append("priority")

    if missing:
        return (
            "✅ नयाँ काम थप्न तयार छु।\n"
            f"कृपया यी विवरण दिनुहोस्: {', '.join(missing)}\n"
            "उदाहरण: title: Brick wall, phase: Masonry, priority: HIGH"
        )

    return (
        "✅ राम्रो। विवरण प्राप्त भयो:\n"
        f"- title: {title}\n"
        f"- phase: {phase}\n"
        f"- priority: {priority}\n"
        "अब पुष्टि गर्नुहोस्: 'save task' भनेर पठाउनुस्।"
    )


def _handle_task_complete(entities: Dict) -> str:
    return (
        "कुन काम पूरा भयो? कृपया task title पठाउनुस्।\n"
        "उदाहरण: complete task Brick wall"
    )


def _handle_expense_add(entities: Dict) -> str:
    return (
        "✅ खर्च थप्न तयार छु।\n"
        "कृपया title, amount र phase पठाउनुस्।\n"
        "उदाहरण: title: Sand purchase, amount: 25000, phase: Foundation"
    )


_HANDLERS.update({
    "TASK_ADD": lambda ents: _handle_task_add(ents),
    "TASK_COMPLETE": lambda ents: _handle_task_complete(ents),
    "EXPENSE_ADD": lambda ents: _handle_expense_add(ents),
})


def dispatch(parse_result: ParseResult) -> str:
    handler = _HANDLERS.get(parse_result.intent)
    if not handler:
        return (
            "माफ गर्नुहोस्, मैले बुझिनँ। "
            "'मदत' भन्नुहोस् म के गर्न सक्छु थाहा पाउन।"
        )
    try:
        return handler(parse_result.entities)
    except Exception as exc:  # pragma: no cover
        return f"त्रुटि: {exc}"
