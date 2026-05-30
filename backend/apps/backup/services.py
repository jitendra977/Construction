import os
from pathlib import Path
from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from .models import BackupLog, BackupSettings

def get_unbacked_up_data_metrics():
    last_success = BackupLog.objects.filter(status='success').first()
    media_root = Path(settings.MEDIA_ROOT)
    
    new_files_count = 0
    new_files_size_bytes = 0
    
    if media_root.exists() and media_root.is_dir():
        for root, dirs, files in os.walk(media_root):
            for file in files:
                file_path = Path(root) / file
                try:
                    stat = file_path.stat()
                    # If we have a successful backup, only count files modified AFTER it
                    if last_success:
                        if stat.st_mtime > last_success.created_at.timestamp():
                            new_files_count += 1
                            new_files_size_bytes += stat.st_size
                    else:
                        # No backups yet, everything is unbacked up
                        new_files_count += 1
                        new_files_size_bytes += stat.st_size
                except OSError:
                    pass
                    
    return {
        'count': new_files_count,
        'size_mb': round(new_files_size_bytes / (1024 * 1024), 2)
    }

def get_drive_quota():
    backup_settings = BackupSettings.get_settings()
    client_id = backup_settings.gdrive_client_id
    client_secret = backup_settings.gdrive_client_secret
    refresh_token = backup_settings.gdrive_refresh_token
    
    if not client_id or not client_secret or not refresh_token:
        return {'error': 'Missing OAuth credentials in Backup Settings'}
        
    try:
        creds = Credentials(
            token=None,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret
        )
        service = build('drive', 'v3', credentials=creds)
        about = service.about().get(fields="storageQuota").execute()
        quota = about.get('storageQuota', {})
        
        limit = int(quota.get('limit', 0))
        usage = int(quota.get('usage', 0))
        
        return {
            'limit_gb': round(limit / (1024**3), 2) if limit else 0,
            'usage_gb': round(usage / (1024**3), 2),
            'usage_percent': round((usage / limit) * 100, 1) if limit else 0
        }
    except Exception as e:
        return {'error': str(e)}

def sync_celery_beat_schedule():
    from django_celery_beat.models import PeriodicTask, CrontabSchedule
    backup_settings = BackupSettings.get_settings()
    
    if backup_settings.is_paused:
        PeriodicTask.objects.filter(name='Automated System Backup').update(enabled=False)
        return

    # Parse standard cron: "minute hour day_of_month month day_of_week"
    parts = backup_settings.schedule_expression.split()
    if len(parts) != 5:
        return
        
    schedule, _ = CrontabSchedule.objects.get_or_create(
        minute=parts[0],
        hour=parts[1],
        day_of_month=parts[2],
        month_of_year=parts[3],
        day_of_week=parts[4]
    )
    
    PeriodicTask.objects.update_or_create(
        name='Automated System Backup',
        defaults={
            'crontab': schedule,
            'task': 'apps.backup.tasks.execute_system_backup',
            'enabled': True
        }
    )
