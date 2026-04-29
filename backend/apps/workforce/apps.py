from django.apps import AppConfig

class WorkforceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.workforce'
    verbose_name = 'Workforce Management'

    def ready(self):
        # Register signals so workforce ↔ attendance sync works
        import apps.workforce.models.workforce_signals  # noqa: F401
