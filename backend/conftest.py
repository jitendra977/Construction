"""
Root pytest configuration for the Construction backend.
Django settings are declared in pytest.ini (DJANGO_SETTINGS_MODULE = config.settings).
Add shared fixtures here as the test suite grows.
"""
import django
from django.conf import settings  # noqa: F401 — ensures settings are loaded early
