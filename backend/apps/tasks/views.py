from rest_framework import viewsets
from .models import Task, TaskUpdate, TaskMedia
from .serializers import TaskSerializer, TaskUpdateSerializer, TaskMediaSerializer

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer

class TaskUpdateViewSet(viewsets.ModelViewSet):
    queryset = TaskUpdate.objects.all()
    serializer_class = TaskUpdateSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

class TaskMediaViewSet(viewsets.ModelViewSet):
    queryset = TaskMedia.objects.all()
    serializer_class = TaskMediaSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset
