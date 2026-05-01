from django.apps import AppConfig


class PhotoIntelConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.photo_intel"
    label = 'photo_intel'
    verbose_name = "Photo Intelligence & Timelapse"

    def ready(self):
        # Register signal handlers (post_save on TaskMedia -> trigger analysis)
        from . import signals  # noqa: F401
