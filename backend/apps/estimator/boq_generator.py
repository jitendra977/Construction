"""
BoQ Auto-Generator service.

Takes a HouseProject + an input dict (total_sqft, storeys, bedrooms...)
and materialises a `GeneratedBoQ` with priced items. Designed to be
deterministic: same template + inputs + rates → same BoQ.

Formula evaluation is done against a whitelist of names to stay safe
(no builtins, no attribute access). We allow basic math: +, -, *, /,
**, parentheses, and the functions min/max/round/abs.
"""
from __future__ import annotations

import ast
import operator as op
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional

from django.db import transaction

from apps.core.models import HouseProject

from .boq_models import (
    BoQTemplate,
    BoQTemplateItem,
    GeneratedBoQ,
    GeneratedBoQItem,
)
from .models import ConstructionRate


# ─── Safe formula evaluator ──────────────────────────────────────────
_BIN_OPS = {
    ast.Add: op.add, ast.Sub: op.sub, ast.Mult: op.mul,
    ast.Div: op.truediv, ast.Pow: op.pow, ast.Mod: op.mod,
    ast.FloorDiv: op.floordiv,
}
_UNARY_OPS = {ast.UAdd: op.pos, ast.USub: op.neg}
_ALLOWED_FUNCS = {
    "min": min, "max": max, "round": round, "abs": abs, "int": int, "float": float,
}


def _eval_formula(expr: str, variables: Dict[str, float]) -> float:
    """Evaluate a restricted arithmetic expression against a variable dict."""
    tree = ast.parse(expr, mode="eval")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"Disallowed constant {node.value!r}")
        if isinstance(node, ast.Num):  # py<3.8 fallback
            return node.n
        if isinstance(node, ast.Name):
            if node.id in variables:
                return variables[node.id]
            raise ValueError(f"Unknown variable: {node.id}")
        if isinstance(node, ast.BinOp):
            return _BIN_OPS[type(node.op)](_eval(node.left), _eval(node.right))
        if isinstance(node, ast.UnaryOp):
            return _UNARY_OPS[type(node.op)](_eval(node.operand))
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in _ALLOWED_FUNCS:
                raise ValueError("Disallowed function call")
            args = [_eval(a) for a in node.args]
            return _ALLOWED_FUNCS[node.func.id](*args)
        raise ValueError(f"Unsupported expression node: {type(node).__name__}")

    return float(_eval(tree))


# ─── Template selection ──────────────────────────────────────────────
def pick_template(
    *, total_sqft: float, storeys: int, quality_tier: str = "STANDARD"
) -> Optional[BoQTemplate]:
    qs = BoQTemplate.objects.filter(is_active=True, quality_tier=quality_tier)
    qs = qs.filter(min_sqft__lte=total_sqft)
    matches: List[BoQTemplate] = []
    for t in qs:
        if t.max_sqft and total_sqft > t.max_sqft:
            continue
        if t.storeys_applicable:
            allowed = {s.strip() for s in t.storeys_applicable.split(",") if s.strip()}
            if allowed and str(storeys) not in allowed:
                continue
        matches.append(t)
    return matches[0] if matches else None


# ─── Generation ──────────────────────────────────────────────────────
def _rate_lookup() -> Dict[str, ConstructionRate]:
    return {r.key: r for r in ConstructionRate.objects.all()}


def _build_variables(inputs: Dict[str, Any]) -> Dict[str, float]:
    """Coerce all input values to float with sensible defaults."""
    def f(name, default=0.0):
        try:
            return float(inputs.get(name, default) or default)
        except (TypeError, ValueError):
            return float(default)

    return {
        "total_sqft": f("total_sqft"),
        "storeys": f("storeys", 1),
        "bedrooms": f("bedrooms", 0),
        "bathrooms": f("bathrooms", 0),
        "kitchens": f("kitchens", 1),
        "wall_height": f("wall_height", 10),
        "plot_length": f("plot_length"),
        "plot_width": f("plot_width"),
    }


@transaction.atomic
def generate_boq(
    *,
    project: HouseProject,
    inputs: Dict[str, Any],
    template: Optional[BoQTemplate] = None,
    generated_by=None,
) -> GeneratedBoQ:
    """
    Materialise a GeneratedBoQ + items from a template and input dict.
    Picks a template by sqft/storeys/quality if one isn't provided.
    """
    variables = _build_variables(inputs)

    if template is None:
        template = pick_template(
            total_sqft=variables["total_sqft"],
            storeys=int(variables["storeys"]),
            quality_tier=inputs.get("quality_tier", "STANDARD"),
        )

    boq = GeneratedBoQ.objects.create(
        project=project,
        template=template,
        inputs=inputs,
        generated_by=generated_by,
    )

    if not template:
        return boq  # empty — UI will prompt admin to create a template

    rates = _rate_lookup()
    category_totals: Dict[str, Decimal] = {}

    for item in template.items.all():
        try:
            qty = _eval_formula(item.quantity_formula, variables)
        except Exception:
            qty = 0.0
        qty = max(0.0, qty)

        # Apply waste factor
        qty_with_waste = qty * (1 + (item.waste_pct / 100.0))

        rate = rates.get(item.rate_key)
        unit_rate = Decimal(rate.value) if rate else Decimal("0")
        total = (Decimal(str(qty_with_waste)) * unit_rate).quantize(Decimal("0.01"))

        GeneratedBoQItem.objects.create(
            boq=boq,
            phase_key=item.phase_key,
            label=item.label,
            category=item.category,
            rate_key=item.rate_key,
            quantity=Decimal(str(round(qty_with_waste, 3))),
            unit=item.unit,
            unit_rate=unit_rate,
            waste_pct=item.waste_pct,
            total=total,
            notes=item.notes,
        )

        category_totals[item.category] = category_totals.get(item.category, Decimal("0")) + total

    boq.material_total = category_totals.get("MATERIAL", Decimal("0"))
    boq.labor_total = category_totals.get("LABOR", Decimal("0"))
    boq.equipment_total = category_totals.get("EQUIPMENT", Decimal("0"))
    boq.other_total = category_totals.get("OTHER", Decimal("0"))
    boq.grand_total = sum(category_totals.values(), Decimal("0"))
    boq.save()
    return boq


# ─── Apply to BudgetCategory ─────────────────────────────────────────
@transaction.atomic
def apply_to_budget(boq: GeneratedBoQ) -> Dict[str, Any]:
    """
    Create / top up BudgetCategory rows from a generated BoQ. Uses the
    CATEGORY_CHOICES label as the category name. Idempotent: running
    twice updates allocations rather than duplicating.
    """
    from apps.finance.models import BudgetCategory

    mapping = {
        "MATERIAL": "Materials",
        "LABOR": "Labor",
        "EQUIPMENT": "Equipment",
        "OTHER": "Other",
    }

    results: Dict[str, Any] = {}
    for cat_key, label in mapping.items():
        total = getattr(boq, f"{cat_key.lower()}_total", Decimal("0")) or Decimal("0")
        if total <= 0:
            continue
        obj, _ = BudgetCategory.objects.update_or_create(
            name=label,
            defaults={"allocation": total, "description": f"Auto-set from BoQ #{boq.pk}"},
        )
        results[label] = float(total)

    boq.is_applied_to_budget = True
    boq.save(update_fields=["is_applied_to_budget"])
    return results


# ─── Seed helper ─────────────────────────────────────────────────────
def seed_default_templates() -> Iterable[BoQTemplate]:
    """
    Populate a sensible default template covering a typical 2-storey
    residential home. Idempotent — skips if a template with the same
    name already exists.
    """
    name = "Standard 2-Storey Residential"
    t, created = BoQTemplate.objects.get_or_create(
        name=name,
        defaults=dict(
            description="Default BoQ for a 2-storey ~1000 sqft Nepali home.",
            quality_tier="STANDARD",
            min_sqft=500,
            max_sqft=2500,
            storeys_applicable="1,2,3",
        ),
    )
    if created:
        default_items = [
            # phase, label, category, rate_key, unit, formula, waste
            ("foundation", "PCC / Footing concrete", "MATERIAL", "CONCRETE_M20_CFT", "cft", "0.6 * total_sqft", 3.0),
            ("structure", "Slab + beam concrete", "MATERIAL", "CONCRETE_M20_CFT", "cft", "1.2 * total_sqft * storeys", 3.0),
            ("structure", "Reinforcement (rebar)", "MATERIAL", "REBAR_KG", "kg", "4.5 * total_sqft * storeys", 2.0),
            ("masonry", "Bricks", "MATERIAL", "BRICK", "pcs", "45 * total_sqft * storeys", 5.0),
            ("masonry", "Cement bags (masonry)", "MATERIAL", "CEMENT_BAG", "bag", "0.85 * total_sqft * storeys", 2.0),
            ("masonry", "Sand", "MATERIAL", "SAND_CFT", "cft", "1.4 * total_sqft * storeys", 5.0),
            ("plaster", "Plaster cement", "MATERIAL", "CEMENT_BAG", "bag", "0.35 * total_sqft * storeys", 2.0),
            ("labor", "Mason labour", "LABOR", "MASON_DAY", "day", "0.09 * total_sqft * storeys", 0.0),
            ("labor", "Helper labour", "LABOR", "HELPER_DAY", "day", "0.14 * total_sqft * storeys", 0.0),
        ]
        for phase, label, cat, key, unit, formula, waste in default_items:
            BoQTemplateItem.objects.create(
                template=t, phase_key=phase, label=label, category=cat,
                rate_key=key, unit=unit, quantity_formula=formula, waste_pct=waste,
            )
    yield t
