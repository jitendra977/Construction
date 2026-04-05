from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.accounts'

    def ready(self):
        # The signals are currently at the bottom of models.py, 
        # but it's cleaner to have a signals.py. For now, we'll import models.
        import apps.accounts.models
