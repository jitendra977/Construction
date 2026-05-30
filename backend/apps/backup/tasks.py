from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task
def run_automated_backup_task(user_id=None):
    from .engine import run_backup
    try:
        log = run_backup(user_id=user_id)
        if log and log.status == 'success':
            logger.info(f"Automated backup completed successfully. ID: {log.id}")
        else:
            logger.error(f"Automated backup failed. Log ID: {log.id if log else 'None'}")
    except Exception as e:
        logger.exception("Failed to run automated backup task")
