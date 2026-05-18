import warnings
from django.apps import AppConfig


class ResourcesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.resources'
    label = 'resources'

    def ready(self):
        warnings.warn(
            "\n\n"
            "⚠️  DEPRECATED: apps.resources is the legacy resources module.\n"
            "   The canonical implementation is apps.resource (api/v1/resource/).\n"
            "   Exception: WastageAlert and WastageThreshold have no equivalent yet —\n"
            "   migrate those models to apps.resource before removing this app.\n"
            "   Scheduled for URL removal in Phase 2, model deletion in Phase 3.\n",
            DeprecationWarning,
            stacklevel=2,
        )
        import apps.resources.signals
