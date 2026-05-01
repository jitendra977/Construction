from django.apps import AppConfig


class EstimateConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.estimate"
    label = 'estimate'
    verbose_name = "Advanced Estimator"
