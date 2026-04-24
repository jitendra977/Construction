"""
Bill & BillPayment views.
"""
from django.db import transaction
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from ..models.bill import Bill, BillPayment
from ..serializers.bill import BillSerializer, BillPaymentSerializer
from ..services.bill import BillService


def _pid(request):
    raw = request.query_params.get("project") or request.data.get("project")
    if raw and str(raw) not in ("", "null", "undefined"):
        try:
            return int(raw)
        except (ValueError, TypeError):
            pass
    return None


class BillViewSet(viewsets.ModelViewSet):
    serializer_class = BillSerializer

    def get_queryset(self):
        qs  = Bill.objects.prefetch_related("fin_items").select_related(
            "expense_account", "payable_account"
        ).order_by("-date")
        pid = _pid(self.request)
        if pid:
            qs = qs.filter(project_id=pid)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            # filter by computed payment_status — requires Python-level filter
            qs = [b for b in qs if b.payment_status == status_filter]
        return qs

    def perform_create(self, serializer):
        pid = _pid(self.request)
        with transaction.atomic():
            bill = serializer.save(project_id=pid)
            BillService.post_bill(
                bill,
                user=self.request.user if self.request.user.is_authenticated else None,
            )

    # ── POST /bills/{id}/pay/ ─────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="pay")
    def pay(self, request, pk=None):
        """Shortcut: pay a bill directly without a separate BillPayment POST."""
        bill = self.get_object()

        data = request.data.copy()
        data["bill"] = str(bill.id)

        ser = BillPaymentSerializer(data=data)
        if not ser.is_valid():
            return Response(ser.errors, status=400)

        try:
            with transaction.atomic():
                payment = ser.save()
                BillService.post_payment(
                    payment,
                    user=request.user if request.user.is_authenticated else None,
                )
            return Response(BillPaymentSerializer(payment).data, status=201)
        except Exception as exc:
            return Response({"error": str(exc)}, status=400)


class BillPaymentViewSet(viewsets.ModelViewSet):
    serializer_class  = BillPaymentSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        qs  = BillPayment.objects.select_related("bill", "bank_account").order_by("-date")
        pid = _pid(self.request)
        if pid:
            qs = qs.filter(bill__project_id=pid)
        bill_id = self.request.query_params.get("bill")
        if bill_id:
            qs = qs.filter(bill_id=bill_id)
        return qs

    def perform_create(self, serializer):
        with transaction.atomic():
            payment = serializer.save()
            BillService.post_payment(
                payment,
                user=self.request.user if self.request.user.is_authenticated else None,
            )
