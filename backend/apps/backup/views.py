from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import BackupLog
from .tasks import run_automated_backup_task

def _is_admin(user):
    return bool(getattr(user, 'is_superuser', False) or getattr(user, 'is_staff', False) or getattr(user, 'is_system_admin', False))

class BackupLogListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        logs = BackupLog.objects.all().order_by('-created_at')[:50]
        data = [
            {
                'id': log.id,
                'status': log.status,
                'file_name': log.file_name,
                'file_size_mb': log.file_size_mb,
                'google_drive_file_id': log.google_drive_file_id,
                'error_message': log.error_message,
                'created_by': log.created_by.get_full_name() if log.created_by else 'System',
                'created_at': log.created_at.isoformat(),
                'completed_at': log.completed_at.isoformat() if log.completed_at else None,
            }
            for log in logs
        ]
        return Response({'logs': data})

class TriggerBackupView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        # Check if system is paused
        from .models import BackupSettings
        if BackupSettings.get_settings().is_paused:
            return Response({'error': 'Backup system is currently paused.'}, status=400)
            
        # Trigger the celery task asynchronously
        task = run_automated_backup_task.delay(user_id=request.user.id)
        
        return Response({
            'success': True,
            'message': 'Backup job has been queued and will run in the background.',
            'task_id': task.id
        })

class BackupAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        from .services import get_unbacked_up_data_metrics, get_drive_quota
        from .models import BackupSettings
        
        settings = BackupSettings.get_settings()
        
        return Response({
            'unbacked_up': get_unbacked_up_data_metrics(),
            'drive_quota': get_drive_quota(),
            'settings': {
                'is_paused': settings.is_paused,
                'schedule': settings.schedule_expression,
                'gdrive_client_id': settings.gdrive_client_id or '',
                'gdrive_client_secret': settings.gdrive_client_secret or '',
                'gdrive_refresh_token': settings.gdrive_refresh_token or '',
                'gdrive_folder_id': settings.gdrive_folder_id or ''
            }
        })

class BackupControlView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, action):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import BackupLog, BackupSettings
        from .services import sync_celery_beat_schedule
        from celery.app.control import Control
        from config.celery import app as celery_app
        
        if action == 'abort':
            task_id = request.data.get('task_id')
            if not task_id:
                return Response({'error': 'Task ID required'}, status=400)
                
            celery_control = Control(app=celery_app)
            celery_control.revoke(task_id, terminate=True)
            
            # Update log
            log = BackupLog.objects.filter(celery_task_id=task_id).first()
            if log:
                log.mark_failed("Aborted by user.")
                
            return Response({'message': 'Task aborted successfully.'})
            
        elif action == 'toggle_pause':
            settings_obj = BackupSettings.get_settings()
            settings_obj.is_paused = not settings_obj.is_paused
            settings_obj.save()
            sync_celery_beat_schedule()
            return Response({'message': f'System {"paused" if settings_obj.is_paused else "resumed"}.'})
            
        elif action == 'update_schedule':
            cron_expr = request.data.get('cron_expr')
            if not cron_expr:
                return Response({'error': 'Cron expression required'}, status=400)
                
            settings_obj = BackupSettings.get_settings()
            settings_obj.schedule_expression = cron_expr
            settings_obj.save()
            sync_celery_beat_schedule()
            return Response({'message': 'Schedule updated successfully.'})
            
        elif action == 'save_credentials':
            settings_obj = BackupSettings.get_settings()
            settings_obj.gdrive_client_id = request.data.get('gdrive_client_id', settings_obj.gdrive_client_id)
            settings_obj.gdrive_client_secret = request.data.get('gdrive_client_secret', settings_obj.gdrive_client_secret)
            settings_obj.gdrive_refresh_token = request.data.get('gdrive_refresh_token', settings_obj.gdrive_refresh_token)
            settings_obj.gdrive_folder_id = request.data.get('gdrive_folder_id', settings_obj.gdrive_folder_id)
            settings_obj.save()
            return Response({'message': 'Google Drive credentials saved successfully.'})
            
        return Response({'error': 'Invalid action'}, status=400)
