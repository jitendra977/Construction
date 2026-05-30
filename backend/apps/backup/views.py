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
            
        # Trigger the celery task asynchronously
        run_automated_backup_task.delay(user_id=request.user.id)
        
        return Response({
            'success': True,
            'message': 'Backup job has been queued and will run in the background.'
        })
