from django.apps import AppConfig


class TelegramBotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.telegram_bot'

    def ready(self):
        from django.db.models.signals import post_migrate
        post_migrate.connect(setup_periodic_tasks, sender=self)

def setup_periodic_tasks(sender, **kwargs):
    try:
        from django_celery_beat.models import PeriodicTask, CrontabSchedule
        import json
        
        # Create a schedule to run at 5:00 PM (17:00) every day
        schedule, created = CrontabSchedule.objects.get_or_create(
            minute='0',
            hour='17',
            day_of_week='*',
            day_of_month='*',
            month_of_year='*'
        )
        
        PeriodicTask.objects.get_or_create(
            crontab=schedule,
            name='Send Daily Telegram Report',
            task='apps.telegram_bot.tasks.send_daily_telegram_report',
        )
    except Exception as e:
        print("Failed to setup periodic tasks for telegram bot:", str(e))
