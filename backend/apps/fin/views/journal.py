"""
JournalEntryViewSet — read all entries, or create a manual one.
"""
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.response import Response

from ..models.journal import JournalEntry
from ..serializers.journal import JournalEntrySerializer
from ..services.ledger import LedgerService


class JournalEntryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET  /journal-entries/           — list (filtered by project)
    GET  /journal-entries/{id}/      — retrieve one entry with lines
    POST /journal-entries/manual/    — create a manual journal entry
    """
    serializer_class = JournalEntrySerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs  = JournalEntry.objects.prefetch_related("fin_lines__account").order_by("-date", "-created_at")
        pid = self.request.query_params.get("project")
        if pid and pid not in ("", "null"):
            try:
                qs = qs.filter(project_id=int(pid))
            except ValueError:
                pass
        src = self.request.query_params.get("source_type")
        if src:
            qs = qs.filter(source_type=src)
        return qs

    def create(self, request, *args, **kwargs):
        data  = request.data
        lines = data.get("lines") or []
        if not lines:
            return Response({"error": "lines is required."}, status=400)

        pid = data.get("project")
        try:
            pid = int(pid) if pid else None
        except ValueError:
            pid = None

        try:
            with transaction.atomic():
                je = LedgerService.post_entry(
                    date=data.get("date"),
                    description=data.get("description", "Manual Entry"),
                    lines=lines,
                    source_type=data.get("source_type", "MANUAL"),
                    source_ref=data.get("source_ref", ""),
                    project_id=pid,
                    user=request.user if request.user.is_authenticated else None,
                )
            return Response(JournalEntrySerializer(je).data, status=201)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)
