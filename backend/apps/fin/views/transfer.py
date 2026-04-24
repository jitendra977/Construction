"""
CashTransferViewSet — create and list cash transfers between accounts.
Creating a transfer automatically posts the journal entry.
"""
from django.db import transaction
from rest_framework import viewsets

from ..models.transfer import CashTransfer
from ..serializers.transfer import CashTransferSerializer
from ..services.banking import BankingService


class CashTransferViewSet(viewsets.ModelViewSet):
    serializer_class  = CashTransferSerializer
    http_method_names = ["get", "post", "head", "options"]   # transfers are immutable once posted

    def get_queryset(self):
        qs  = CashTransfer.objects.select_related("from_account", "to_account").order_by("-date")
        pid = self.request.query_params.get("project")
        if pid and pid not in ("", "null"):
            try:
                from django.db.models import Q
                qs = qs.filter(
                    Q(from_account__project_id=int(pid)) |
                    Q(to_account__project_id=int(pid))   |
                    Q(project_id=int(pid))
                )
            except ValueError:
                pass
        return qs

    def perform_create(self, serializer):
        pid = self.request.data.get("project")
        try:
            pid = int(pid) if pid else None
        except (ValueError, TypeError):
            pid = None

        with transaction.atomic():
            transfer = serializer.save(project_id=pid)
            BankingService.execute_transfer(
                transfer,
                user=self.request.user if self.request.user.is_authenticated else None,
            )
