"""
Resolve a user-defined ConstructionPhase.name (often Nepali, free-form) to
an internal canonical phase key from constants.PHASE_KEYS.
"""
from __future__ import annotations

from typing import Optional

from apps.photo_intel.constants import PHASE_KEYWORDS, PHASE_UNKNOWN


def resolve_phase_name_to_key(name: Optional[str]) -> str:
    """
    Best-effort classification of a free-form phase name into a canonical key.
    Case-insensitive substring match against PHASE_KEYWORDS.
    """
    if not name:
        return PHASE_UNKNOWN

    needle = name.lower()
    best_key = PHASE_UNKNOWN
    best_score = 0

    for key, words in PHASE_KEYWORDS.items():
        score = sum(1 for w in words if w in needle)
        if score > best_score:
            best_score = score
            best_key = key

    return best_key


def resolve_task_phase_key(task) -> str:
    """
    Given a `tasks.Task` instance, return the canonical internal phase key
    for its assigned ConstructionPhase (or UNKNOWN).
    """
    if task is None or task.phase is None:
        return PHASE_UNKNOWN
    return resolve_phase_name_to_key(task.phase.name)
