from django.urls import path
from .views import BackupLogListView, TriggerBackupView, BackupAnalyticsView, BackupControlView

app_name = 'backup'

urlpatterns = [
    path('logs/', BackupLogListView.as_view(), name='backup-logs'),
    path('trigger/', TriggerBackupView.as_view(), name='trigger-backup'),
    path('analytics/', BackupAnalyticsView.as_view(), name='backup-analytics'),
    path('control/<str:action>/', BackupControlView.as_view(), name='backup-control'),
]
