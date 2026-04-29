from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from ..models import Skill, WorkerSkill
from ..serializers import SkillSerializer, WorkerSkillSerializer

class SkillViewSet(viewsets.ModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['trade_type', 'is_active']
    search_fields = ['name']
    ordering_fields = ['name']

class WorkerSkillViewSet(viewsets.ModelViewSet):
    queryset = WorkerSkill.objects.all()
    serializer_class = WorkerSkillSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker', 'skill', 'level', 'is_certified', 'is_verified']
    ordering_fields = ['years_experience', 'level']
