from django.apps import AppConfig


class TasksConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.tasks'

    def ready(self):
        import apps.tasks.signals  # noqa: F401 — registers post_save/post_delete hooks
