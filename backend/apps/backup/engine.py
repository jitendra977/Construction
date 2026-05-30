import os
import zipfile
import subprocess
import datetime
import json
import logging
import logging
from pathlib import Path
from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from .models import BackupLog

logger = logging.getLogger(__name__)

def generate_database_dump(output_path: Path):
    db_settings = settings.DATABASES['default']
    engine = db_settings.get('ENGINE', '')
    
    if 'sqlite' in engine:
        import shutil
        sqlite_file = db_settings.get('NAME')
        if sqlite_file and os.path.exists(sqlite_file):
            shutil.copy2(sqlite_file, output_path)
            return True
        return False
        
    db_name = db_settings.get('NAME')
    db_user = db_settings.get('USER')
    db_pass = db_settings.get('PASSWORD')
    db_host = db_settings.get('HOST', 'localhost')
    db_port = db_settings.get('PORT', '5432')
    
    env = os.environ.copy()
    if db_pass:
        env['PGPASSWORD'] = str(db_pass)
        
    cmd = [
        'pg_dump',
        '-U', str(db_user),
        '-h', str(db_host),
        '-p', str(db_port),
        '-F', 'c',
        '-f', str(output_path),
        str(db_name)
    ]
    
    try:
        subprocess.run(cmd, env=env, check=True, capture_output=True)
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"pg_dump failed: {e.stderr.decode()}")
        raise Exception(f"pg_dump failed: {e.stderr.decode()}")

def create_backup_zip(zip_path: Path, sql_path: Path):
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        if sql_path.exists():
            zf.write(sql_path, arcname=sql_path.name)
            
        media_root = Path(settings.MEDIA_ROOT)
        if media_root.exists() and media_root.is_dir():
            for root, dirs, files in os.walk(media_root):
                for file in files:
                    file_path = Path(root) / file
                    arcname = Path('media') / file_path.relative_to(media_root)
                    zf.write(file_path, arcname=str(arcname))

def upload_to_drive(file_path: Path, folder_id: str):
    client_id = getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', '')
    client_secret = getattr(settings, 'GOOGLE_DRIVE_CLIENT_SECRET', '')
    refresh_token = getattr(settings, 'GOOGLE_DRIVE_REFRESH_TOKEN', '')
    
    if not client_id or not client_secret or not refresh_token:
        raise Exception("Missing OAuth2 credentials (Client ID, Secret, or Refresh Token).")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        token_uri='https://oauth2.googleapis.com/token',
        client_id=client_id,
        client_secret=client_secret
    )
    
    service = build('drive', 'v3', credentials=creds)
    
    file_metadata = {
        'name': file_path.name,
        'parents': [folder_id]
    }
    
    media = MediaFileUpload(str(file_path), mimetype='application/zip', resumable=True)
    uploaded_file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    
    return uploaded_file.get('id')

def run_backup(user_id=None):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.filter(id=user_id).first() if user_id else None
    
    log = BackupLog.objects.create(created_by=user, status='in_progress')
    
    folder_id = getattr(settings, 'GOOGLE_DRIVE_FOLDER_ID', '')
    client_id = getattr(settings, 'GOOGLE_DRIVE_CLIENT_ID', '')
    
    if not folder_id or not client_id:
        log.mark_failed("Missing Google Drive OAuth credentials or folder ID in settings.")
        return log
        
    timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    temp_dir = Path(settings.BASE_DIR) / 'scratch'
    temp_dir.mkdir(exist_ok=True)
    
    sql_path = temp_dir / f"db_dump_{timestamp}.sql"
    zip_path = temp_dir / f"ConstructPro_Backup_{timestamp}.zip"
    
    try:
        generate_database_dump(sql_path)
        create_backup_zip(zip_path, sql_path)
        
        drive_file_id = upload_to_drive(zip_path, folder_id)
        
        size_mb = zip_path.stat().st_size / (1024 * 1024)
        log.mark_success(zip_path.name, size_mb, drive_file_id)
        
    except Exception as e:
        logger.exception("Backup failed")
        log.mark_failed(str(e))
        
    finally:
        if sql_path.exists():
            sql_path.unlink()
        if zip_path.exists():
            zip_path.unlink()
            
    return log
