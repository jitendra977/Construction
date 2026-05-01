from django.apps import AppConfig


class ResourceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.resource"
    label = 'resource'
    verbose_name = "Resource Module"
