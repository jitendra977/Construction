import warnings
from django.apps import AppConfig


class FinanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.finance'
    label = 'finance'

    def ready(self):
        warnings.warn(
            "\n\n"
            "⚠️  DEPRECATED: apps.finance is the legacy finance module.\n"
            "   The canonical implementation is apps.fin (api/v1/fin/).\n"
            "   Do NOT add new features here. Migrate remaining logic to apps.fin.\n"
            "   Scheduled for URL removal in Phase 2, model deletion in Phase 3.\n",
            DeprecationWarning,
            stacklevel=2,
        )
        import apps.finance.signals
