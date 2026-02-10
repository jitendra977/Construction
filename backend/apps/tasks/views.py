from rest_framework import viewsets
from .models import Task, TaskUpdate, TaskMedia
from .serializers import TaskSerializer, TaskUpdateSerializer, TaskMediaSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TaskUpdateViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer

class TaskMediaViewSet(viewsets.ModelViewSet):
    queryset = TaskMedia.objects.all()
    serializer_class = TaskMediaSerializer
