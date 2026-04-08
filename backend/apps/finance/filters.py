from django_filters import rest_framework as filters
from .models import Expense, Payment

class ExpenseFilter(filters.FilterSet):
    start_date = filters.DateFilter(field_name="date", lookup_expr='gte')
    end_date = filters.DateFilter(field_name="date", lookup_expr='lte')
    status = filters.CharFilter(method='filter_status')
    category = filters.NumberFilter(field_name="category")
    
    class Meta:
        model = Expense
        fields = ['category', 'phase']

    def filter_status(self, queryset, name, value):
        if value == 'PAID':
            return queryset.filter(is_paid=True)
        if value == 'DUE':
            return queryset.filter(is_paid=False)
        if value == 'PARTIAL':
            return queryset.filter(payments__isnull=False, is_paid=False).distinct()
        return queryset
