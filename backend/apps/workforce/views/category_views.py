from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import WorkforceCategory, WorkforceRole
from ..serializers import WorkforceCategorySerializer, WorkforceRoleSerializer

class WorkforceCategoryViewSet(viewsets.ModelViewSet):
    queryset = WorkforceCategory.objects.all()
    serializer_class = WorkforceCategorySerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['parent', 'is_active']
    search_fields = ['name']
    ordering_fields = ['order', 'name']

class WorkforceRoleViewSet(viewsets.ModelViewSet):
    queryset = WorkforceRole.objects.all()
    serializer_class = WorkforceRoleSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'trade_code', 'is_active', 'requires_license', 'requires_cert']
    search_fields = ['title', 'code']
    ordering_fields = ['title']
