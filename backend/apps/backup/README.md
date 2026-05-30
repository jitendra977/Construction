# Auto Backup System (apps.backup)

The Auto Backup System is a standalone Django application built to securely snapshot the PostgreSQL database and the `/media/` folder, bundle them into a zip file, and upload the archive directly to your personal Google Drive (5TB tier).

## Features
1. **Automated Exports:** Dumps the PostgreSQL database and safely compresses it with all uploaded photos/documents.
2. **Native Google Drive Uploads:** Uses User OAuth2 credentials to upload directly as the authenticated user (bypassing Service Account 15GB limits).
3. **Audit Log:** Every backup is logged to the `BackupLog` database table for historical auditing.
4. **Celery Integration:** Built to run in the background via `@shared_task` to prevent blocking the API.

## Requirements
To function correctly, the `.env` file must contain the following credentials:
- `GOOGLE_DRIVE_CLIENT_ID`: Your Google Cloud OAuth Desktop Client ID
- `GOOGLE_DRIVE_CLIENT_SECRET`: Your Google Cloud OAuth Desktop Client Secret
- `GOOGLE_DRIVE_REFRESH_TOKEN`: The permanent refresh token generated via `get_refresh_token.py`
- `GOOGLE_DRIVE_FOLDER_ID`: The target folder ID inside your Google Drive.

## Components
- `models.py`: Defines the `BackupLog` model.
- `engine.py`: The core engine utilizing `pg_dump`, `zipfile`, and `google-api-python-client`.
- `tasks.py`: Asynchronous Celery wrapper.
- `views.py`: Exposes a `/trigger/` and `/logs/` endpoint for the React frontend.

## How to Test
You can manually trigger a backup directly from the Python shell:
```python
from apps.backup.engine import run_backup
log = run_backup()
print(log.status, log.error_message)
```
