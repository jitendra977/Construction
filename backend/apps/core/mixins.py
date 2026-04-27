"""
ProjectScopedMixin
==================
A DRF mixin that restricts any ViewSet's queryset to rows that belong to a
project the current user is a member of.

Usage
-----
class MyViewSet(ProjectScopedMixin, viewsets.ModelViewSet):
    project_field = 'project'          # ORM lookup path to the HouseProject
    queryset = MyModel.objects.all()
    ...

The `project_field` class attribute is the Django ORM double-underscore path
from the model to the HouseProject FK.  Common values:
    'project'                   – direct FK
    'phase__project'            – one hop via ConstructionPhase
    'task__phase__project'      – two hops via Task → Phase
    'floor__project'            – one hop via Floor
    'material__project'         – one hop via Material
    'funding_source__project'   – one hop via FundingSource
    'category__project'         – one hop via BudgetCategory

Access rules
------------
• System admin (is_system_admin=True)  → sees everything (no filter applied).
• Authenticated, non-admin             → only rows whose project is in the
                                         user's ProjectMember list.
• Unauthenticated                      → qs.none() (should be caught by
                                         permission_classes first, but
                                         belt-and-suspenders).
"""

from __future__ import annotations


class ProjectScopedMixin:
    """Apply project-based row-level security to any ViewSet queryset."""

    # Override per ViewSet — ORM path from the model to HouseProject
    project_field: str = "project"

    # ── helpers ──────────────────────────────────────────────────────────────

    def _get_user_project_ids(self) -> list[int] | None:
        """
        Returns:
            None          — user is a system admin; apply no filter.
            []            — user has no projects; queryset will be empty.
            [1, 2, ...]   — filter to these project IDs.
        """
        user = self.request.user  # type: ignore[attr-defined]

        if not user.is_authenticated:
            return []

        if getattr(user, "is_system_admin", False):
            return None  # admin sees everything

        from apps.core.models import ProjectMember

        return list(
            ProjectMember.objects.filter(user=user).values_list("project_id", flat=True)
        )

    # ── override ─────────────────────────────────────────────────────────────

    def get_queryset(self):  # type: ignore[override]
        qs = super().get_queryset()  # type: ignore[misc]

        project_ids = self._get_user_project_ids()

        if project_ids is None:
            # Admin — no restriction
            return qs

        if not project_ids:
            # Not a member of any project
            return qs.none()

        return qs.filter(**{f"{self.project_field}__in": project_ids})
