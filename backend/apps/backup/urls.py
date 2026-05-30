from django.urls import path
from . import views

app_name = 'backup'

urlpatterns = [
    path('logs/', views.BackupLogListView.as_view(), name='backup-logs'),
    path('trigger/', views.TriggerBackupView.as_view(), name='backup-trigger'),
]
