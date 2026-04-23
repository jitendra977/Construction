"""
Permit Co-Pilot — service functions.

materialise_checklist — copies a MunicipalityTemplate's steps into a
                        PermitChecklist with live ChecklistItems.
refresh_deadlines     — marks overdue reminders, inserts missing ones
                        based on item.due_date.
seed_kathmandu_template — ships a reasonable default for users who
                        just want to get going.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Iterable

from django.db import transaction

from .copilot_models import (
    ChecklistItem,
    DeadlineReminder,
    DocumentTemplate,
    MunicipalityStep,
    MunicipalityTemplate,
    PermitChecklist,
)


@transaction.atomic
def materialise_checklist(
    *, project, template: MunicipalityTemplate, start_on: date | None = None
) -> PermitChecklist:
    start_on = start_on or date.today()
    checklist = PermitChecklist.objects.create(
        project=project,
        template=template,
        status="IN_PROGRESS",
        started_at=start_on,
    )
    running_date = start_on
    for step in template.steps.all().prefetch_related("required_documents"):
        due = running_date + timedelta(days=step.typical_days)
        item = ChecklistItem.objects.create(
            checklist=checklist,
            source_step=step,
            order=step.order,
            title=step.title,
            description=step.description,
            due_date=due,
        )
        running_date = due

    # Target completion = last item's due
    last = checklist.items.order_by("-due_date").first()
    if last:
        checklist.target_completion = last.due_date
        checklist.save(update_fields=["target_completion"])
    return checklist


def refresh_deadlines(today: date | None = None) -> int:
    """Mark overdue items and ensure reminders exist. Returns # mutated."""
    today = today or date.today()
    n = 0
    for item in ChecklistItem.objects.exclude(status="DONE").filter(due_date__isnull=False):
        # Ensure a reminder exists 3 days before due
        remind_on = item.due_date - timedelta(days=3)
        DeadlineReminder.objects.get_or_create(
            item=item, remind_on=remind_on,
            defaults={"message": f"Deadline approaching: {item.title}"},
        )
        # Overdue handling
        if item.due_date < today:
            item.status = "BLOCKED" if item.status == "TODO" else item.status
            DeadlineReminder.objects.update_or_create(
                item=item, remind_on=today,
                defaults={"message": f"Overdue: {item.title}", "status": "OVERDUE"},
            )
            n += 1
    return n


def seed_kathmandu_template() -> MunicipalityTemplate:
    """Idempotent — creates a default Kathmandu Metropolitan template."""
    tmpl, created = MunicipalityTemplate.objects.get_or_create(
        name="Kathmandu Metro — Residential Building Permit",
        municipality="Kathmandu Metropolitan City",
        defaults={
            "province": "Bagmati",
            "description": "Default residential building permit pipeline.",
        },
    )
    if not created:
        return tmpl

    # Seed core DocumentTemplates (idempotent by key)
    docs = [
        ("LALPURJA", "Lalpurja (Land Ownership Certificate)", "LAND", "Malpot Karyalaya"),
        ("CHARKILLA", "Charkilla (Boundary Certificate)", "LAND", "Ward Office"),
        ("NAGRIKTA", "Nagrikta (Citizenship)", "ID", "CDO Office"),
        ("NAKSHA", "Naksha (Architectural Drawings)", "DRAWING", "Licensed Architect"),
        ("STRUCTURAL", "Structural Drawings", "DRAWING", "Licensed Engineer"),
        ("TAX_CLEARANCE", "Tax Clearance Receipt", "APPROVAL", "Ward Office"),
    ]
    doc_objs = {}
    for key, label, category, source in docs:
        obj, _ = DocumentTemplate.objects.get_or_create(
            key=key, defaults={"label": label, "category": category, "source_hint": source}
        )
        doc_objs[key] = obj

    # Steps (order, title, typical_days, fee, required doc keys)
    steps = [
        (1, "Ward recommendation", 3, 200, ["NAGRIKTA", "LALPURJA"]),
        (2, "Submit Naksha for approval", 14, 5000, ["NAKSHA", "STRUCTURAL", "LALPURJA"]),
        (3, "Site inspection", 7, 0, []),
        (4, "Revision round", 7, 0, ["NAKSHA"]),
        (5, "Tax clearance verification", 5, 1000, ["TAX_CLEARANCE"]),
        (6, "Final permit issuance", 3, 10000, []),
    ]
    for order, title, days, fee, keys in steps:
        step = MunicipalityStep.objects.create(
            template=tmpl, order=order, title=title,
            typical_days=days, fee_estimate=fee,
        )
        for k in keys:
            step.required_documents.add(doc_objs[k])

    return tmpl
