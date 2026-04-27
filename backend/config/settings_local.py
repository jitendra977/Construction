"""
Local development settings — SQLite, no Redis, no Celery worker needed.

Used by scripts/run_local.sh via:
    DJANGO_SETTINGS_MODULE=config.settings_local
"""
from config.settings import *   # noqa: F401, F403

# ── Database: always SQLite locally ──────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── Cache: dummy (no Redis needed) ───────────────────────────────────────────
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# ── Celery: run tasks inline, no worker needed ────────────────────────────────
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# ── Dev-friendly overrides ────────────────────────────────────────────────────
DEBUG = True
SECRET_KEY = 'local-dev-secret-key-not-for-production'
ALLOWED_HOSTS = ['*']
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://localhost:3000',
]
CORS_ALLOW_ALL_ORIGINS = True   # convenience for local dev

# ── Email: print to console ───────────────────────────────────────────────────
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
