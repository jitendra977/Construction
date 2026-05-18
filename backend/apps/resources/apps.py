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
            "   WastageAlert and WastageThreshold have been migrated to apps.resource.\n"
            "   This app is now safe to remove — delete URL includes, then the app.\n"
            "   Scheduled for URL removal in Phase 2, model deletion in Phase 3.\n",
            DeprecationWarning,
            stacklevel=2,
        )
        import apps.resources.signals
