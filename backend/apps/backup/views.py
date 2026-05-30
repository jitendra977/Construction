from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import BackupLog
from .tasks import run_automated_backup_task
import logging

logger = logging.getLogger(__name__)

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
                'celery_task_id': log.celery_task_id,
                'progress_percent': log.progress_percent,
                'current_stage': log.current_stage,
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

        # Try Celery first; if no broker/workers available fall back to a background thread
        try:
            task = run_automated_backup_task.apply_async(
                kwargs={'user_id': request.user.id},
                expires=3600
            )
            return Response({
                'success': True,
                'message': 'Backup job has been queued and will run in the background.',
                'task_id': task.id
            })
        except Exception:
            # No Celery broker — run directly in a daemon thread so the request returns immediately
            import threading
            from .engine import run_backup

            def _run():
                run_backup(user_id=request.user.id, task_id=None)

            t = threading.Thread(target=_run, daemon=True)
            t.start()
            return Response({
                'success': True,
                'message': 'Backup started in the background (direct mode).',
                'task_id': None
            })

class BackupAnalyticsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        try:
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
        except Exception as exc:
            logger.exception("Backup analytics endpoint failed")
            return Response({
                'unbacked_up': {'count': 0, 'size_mb': 0},
                'drive_quota': {'error': 'Backup analytics unavailable'},
                'settings': {
                    'is_paused': False,
                    'schedule': '0 2 * * *',
                    'gdrive_client_id': '',
                    'gdrive_client_secret': '',
                    'gdrive_refresh_token': '',
                    'gdrive_folder_id': '',
                },
                'error': str(exc),
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

class BackupControlView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, action):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)
            
        from .models import BackupLog, BackupSettings
        
        if action == 'abort':
            from celery.app.control import Control
            from config.celery import app as celery_app

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
            from .services import sync_celery_beat_schedule

            settings_obj = BackupSettings.get_settings()
            settings_obj.is_paused = not settings_obj.is_paused
            settings_obj.save()
            sync_celery_beat_schedule()
            return Response({'message': f'System {"paused" if settings_obj.is_paused else "resumed"}.'})
            
        elif action == 'update_schedule':
            from .services import sync_celery_beat_schedule

            cron_expr = request.data.get('cron_expr')
            if not cron_expr:
                return Response({'error': 'Cron expression required'}, status=400)
                
            settings_obj = BackupSettings.get_settings()
            settings_obj.schedule_expression = cron_expr
            settings_obj.save()
            sync_celery_beat_schedule()
            return Response({'message': 'Schedule updated successfully.'})
            
        elif action == 'save_credentials':
            try:
                settings_obj = BackupSettings.get_settings()
                settings_obj.gdrive_client_id = request.data.get('gdrive_client_id', settings_obj.gdrive_client_id)
                settings_obj.gdrive_client_secret = request.data.get('gdrive_client_secret', settings_obj.gdrive_client_secret)
                settings_obj.gdrive_refresh_token = request.data.get('gdrive_refresh_token', settings_obj.gdrive_refresh_token)
                settings_obj.gdrive_folder_id = request.data.get('gdrive_folder_id', settings_obj.gdrive_folder_id)
                settings_obj.save()
                return Response({'message': 'Google Drive credentials saved successfully.'})
            except Exception as exc:
                logger.exception("Saving backup credentials failed")
                return Response({
                    'error': 'Could not save Google Drive credentials.',
                    'detail': str(exc),
                }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        elif action == 'test_connection':
            settings_obj = BackupSettings.get_settings()
            client_id = request.data.get('gdrive_client_id') or settings_obj.gdrive_client_id
            client_secret = request.data.get('gdrive_client_secret') or settings_obj.gdrive_client_secret
            refresh_token = request.data.get('gdrive_refresh_token') or settings_obj.gdrive_refresh_token
            folder_id = request.data.get('gdrive_folder_id') or settings_obj.gdrive_folder_id

            if not all([client_id, client_secret, refresh_token, folder_id]):
                return Response({'success': False, 'message': 'Credentials are incomplete. Please fill in all four fields first.'}, status=400)

            try:
                from google.oauth2.credentials import Credentials
                from googleapiclient.discovery import build

                creds = Credentials(
                    token=None,
                    refresh_token=refresh_token,
                    token_uri='https://oauth2.googleapis.com/token',
                    client_id=client_id,
                    client_secret=client_secret,
                )
                service = build('drive', 'v3', credentials=creds)
                # Try to fetch the target folder to validate both auth and folder access
                folder = service.files().get(fileId=folder_id, fields='id,name').execute()
                return Response({'success': True, 'message': f'Connection successful! Backup folder: "{folder.get("name", folder_id)}"'})
            except Exception as e:
                return Response({'success': False, 'message': f'Connection failed: {str(e)}'}, status=400)

        return Response({'error': 'Invalid action'}, status=400)


class BackupProgressView(APIView):
    """Lightweight polling endpoint — returns the most recent in-progress or latest backup log."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=status.HTTP_403_FORBIDDEN)

        # Active backup first
        log = BackupLog.objects.filter(status='in_progress').order_by('-created_at').first()
        if not log:
            log = BackupLog.objects.order_by('-created_at').first()

        if not log:
            return Response({'active': False})

        return Response({
            'active': log.status == 'in_progress',
            'id': log.id,
            'status': log.status,
            'progress_percent': log.progress_percent,
            'current_stage': log.current_stage,
            'error_message': log.error_message,
            'file_name': log.file_name,
            'file_size_mb': log.file_size_mb,
        })
