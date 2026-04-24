from django.db.models import Sum, F, Q, Value, DecimalField
from django.db.models.functions import Coalesce
from django_filters import rest_framework as filters
from .models import Expense


class ExpenseFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = filters.DateFilter(field_name="date", lookup_expr="lte")
    status = filters.CharFilter(method="filter_status")
    category = filters.NumberFilter(field_name="category")

    class Meta:
        model = Expense
        fields = ["category", "phase", "project"]

    def filter_status(self, queryset, name, value):
        value = (value or "").upper()
        if value not in {"PAID", "PARTIAL", "UNPAID", "DUE"}:
            return queryset

        zero = Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))
        qs = queryset.annotate(
            _paid=Coalesce(Sum("payments__amount"), zero)
        )

        if value == "PAID":
            return qs.filter(_paid__gte=F("amount"), amount__gt=0)
        if value == "PARTIAL":
            return qs.filter(_paid__gt=0).filter(Q(_paid__lt=F("amount")) | Q(amount=0))
        if value == "UNPAID":
            return qs.filter(_paid=0)
        # DUE = anything not fully paid
        return qs.filter(Q(_paid__lt=F("amount")) | Q(amount=0))
