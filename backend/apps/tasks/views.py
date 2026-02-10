from rest_framework import viewsets
from .models import Task, TaskUpdate
from .serializers import TaskSerializer, TaskUpdateSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TaskUpdateViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer
