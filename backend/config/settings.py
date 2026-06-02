"""
Django settings for construction management project.
"""
from pathlib import Path
from datetime import timedelta
from decouple import config, Csv
import dj_database_url

# ── Sentry — error tracking ───────────────────────────────────────────────────
# Set SENTRY_DSN in your environment to enable error tracking.
# Leave it unset (or empty) in local dev — Sentry is completely disabled then.
_SENTRY_DSN = config('SENTRY_DSN', default='')
if _SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.redis import RedisIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    import logging as _logging

    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        integrations=[
            DjangoIntegration(
                transaction_style='url',   # group by URL pattern, not view name
                middleware_spans=True,
            ),
            CeleryIntegration(),
            RedisIntegration(),
            # Capture WARNING+ as breadcrumbs, ERROR+ as Sentry events
            LoggingIntegration(
                level=_logging.WARNING,
                event_level=_logging.ERROR,
            ),
        ],
        # % of transactions sent to Sentry Performance; tune per-env via env var
        traces_sample_rate=config('SENTRY_TRACES_SAMPLE_RATE', default=0.0, cast=float),
        # % of sessions with full profiling data
        profiles_sample_rate=config('SENTRY_PROFILES_SAMPLE_RATE', default=0.0, cast=float),
        environment=config('SENTRY_ENVIRONMENT', default='development'),
        send_default_pii=False,   # never send passwords / tokens to Sentry
    )

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY: No default — container refuses to start if SECRET_KEY is missing from .env
SECRET_KEY = config('SECRET_KEY')

# Default False — must be explicitly set to True only in local dev .env
DEBUG = config('DEBUG', default=False, cast=bool)

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ── Security headers & cookie hardening ───────────────────────
SECURE_SSL_REDIRECT           = config('SECURE_SSL_REDIRECT', default=False, cast=bool)
CSRF_TRUSTED_ORIGINS          = config('CSRF_TRUSTED_ORIGINS', default='http://localhost:8000,http://localhost:5173,http://localhost:5174', cast=Csv())
SECURE_PROXY_SSL_HEADER       = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_CONTENT_TYPE_NOSNIFF   = True
SECURE_BROWSER_XSS_FILTER     = True
X_FRAME_OPTIONS               = 'SAMEORIGIN'

# HSTS — enable after confirming HTTPS is stable; start at 3600 then ramp to 31536000
SECURE_HSTS_SECONDS            = config('SECURE_HSTS_SECONDS',            default=0,     cast=int)
SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=False, cast=bool)
SECURE_HSTS_PRELOAD            = config('SECURE_HSTS_PRELOAD',            default=False, cast=bool)

# Cookies: always secure + httponly in production; override to False in local dev only
SESSION_COOKIE_SECURE   = config('SESSION_COOKIE_SECURE',  default=True,  cast=bool)
CSRF_COOKIE_SECURE      = config('CSRF_COOKIE_SECURE',     default=True,  cast=bool)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY    = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE    = 'Lax'

# NOTE: Do NOT set USE_X_FORWARDED_HOST = True with Nginx Proxy Manager.
# NPM already sets `Host: <domain>` correctly on the proxied request.
# Enabling USE_X_FORWARDED_HOST causes Django to read X-Forwarded-Host instead,
# which NPM may send with a port suffix (e.g. api.domain.com:443) that won't
# match ALLOWED_HOSTS → Django returns 400 Bad Request.

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'simple_history',
    'drf_spectacular',
    
    # Celery / task scheduling
    'django_celery_beat',
    'django_celery_results',

    # Local apps
    'apps.accounts',
    'apps.core',
    'apps.tasks',
    'apps.finance',
    'apps.permits',
    'apps.photo_intel',
    'apps.analytics',
    'apps.assistant',

    # ── Finance Module (clean separate implementation) ──────────────────────
    'apps.financials',

    # ── Resource Module ──────────────────────────────────────────────────────
    'apps.resource',

    # ── Data Transfer (import / export) ──────────────────────────────────────
    'apps.data_transfer',

    # ── Advanced Estimator ────────────────────────────────────────────────────
    'apps.estimate',

    # ── Attendance ────────────────────────────────────────────────────────────
    'apps.attendance',

    # ── Workforce (includes Team model) ──────────────────────────────────────
    'apps.workforce',

    # ── Location Tracking (Mobile GPS Geofencing) ────────────────────────────
    'apps.location_tracking',

    # ── Field CCTV ─────────────────────────────────────────────────────────────
    'apps.cctv',

    # ── Worker Portal (field worker API — no models, no migrations) ───────────
    'apps.worker',

    # ── Biometric Face Authentication ─────────────────────────────────────────
    'apps.biometrics',

    # ── Auto Backup System ────────────────────────────────────────────────────
    'apps.backup',

    # ── Telegram Bot Integration ──────────────────────────────────────────────
    'apps.telegram_bot',

    # ── Team Messenger (Phase 1) ─────────────────────────────────────────────
    'apps.messenger',
]

# Explicitly map migration folders for nested apps to prevent loader errors
MIGRATION_MODULES = {
    'accounts': 'apps.accounts.migrations',
    'core': 'apps.core.migrations',
    'attendance': 'apps.attendance.migrations',
    'workforce': 'apps.workforce.migrations',
    'tasks': 'apps.tasks.migrations',
    'finance': 'apps.finance.migrations',
    'financials': 'apps.financials.migrations',
    'resource': 'apps.resource.migrations',
    'analytics': 'apps.analytics.migrations',
    'assistant': 'apps.assistant.migrations',
    'permits': 'apps.permits.migrations',
    'photo_intel': 'apps.photo_intel.migrations',
    'data_transfer': 'apps.data_transfer.migrations',
    'estimate': 'apps.estimate.migrations',
    'location_tracking': 'apps.location_tracking.migrations',
    'cctv': 'apps.cctv.migrations',
    'worker': 'apps.worker.migrations',
    'biometrics': 'apps.biometrics.migrations',
    'backup': 'apps.backup.migrations',
    'telegram_bot': 'apps.telegram_bot.migrations',
    'messenger': 'apps.messenger.migrations',
}

# ─── Photo Intelligence (HCMS-2) ──────────────────────────────────────
# Swap to 'google_vision' or 'openai_vision' to call an external vision
# API. Falls back to the heuristic analyzer automatically when credentials
# are missing. PHOTO_INTEL_SYNC=True makes the post-save signal run the
# analyzer inline (used by tests).
PHOTO_INTEL_ANALYZER = config('PHOTO_INTEL_ANALYZER', default='heuristic')
PHOTO_INTEL_SYNC = config('PHOTO_INTEL_SYNC', default=False, cast=bool)
GOOGLE_VISION_API_KEY = config('GOOGLE_VISION_API_KEY', default='')
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')

# ── AI / साथी ─────────────────────────────────────────────────────────────────
GROQ_API_KEY  = config('GROQ_API_KEY',  default='')
GROQ_MODEL    = config('GROQ_MODEL',    default='llama-3.3-70b-versatile')
GEMINI_API_KEY = config('GEMINI_API_KEY', default='')
GEMINI_MODEL  = config('GEMINI_MODEL',  default='gemini-2.0-flash')
ELEVENLABS_API_KEY  = config('ELEVENLABS_API_KEY',  default='')
ELEVENLABS_VOICE_ID = config('ELEVENLABS_VOICE_ID', default='pNInz6obpgDQGcFmaJgB')
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')

# ── GitHub Actions CI/CD Deployment Token ──────────────────────────────────────
GITHUB_DEPLOY_TOKEN = config('GITHUB_DEPLOY_TOKEN', default='')

# ── Google Drive Auto Backup ───────────────────────────────────────────────────
GOOGLE_DRIVE_CLIENT_ID = config('GOOGLE_DRIVE_CLIENT_ID', default='')
GOOGLE_DRIVE_CLIENT_SECRET = config('GOOGLE_DRIVE_CLIENT_SECRET', default='')
GOOGLE_DRIVE_REFRESH_TOKEN = config('GOOGLE_DRIVE_REFRESH_TOKEN', default='')
GOOGLE_DRIVE_FOLDER_ID = config('GOOGLE_DRIVE_FOLDER_ID', default='')


MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # Attaches X-Request-Id to every request/response for log correlation + Sentry
    'utils.request_id_middleware.RequestIdMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'simple_history.middleware.HistoryRequestMiddleware',
    'apps.core.signals.AuditLogMiddleware',
    # Injects Deprecation + Sunset headers on legacy API prefixes (/finance/, /estimator/)
    'utils.deprecation_middleware.DeprecationWarningMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

import dj_database_url

# ── Database ──────────────────────────────────────────────────
# Production: PostgreSQL via DB_* env vars.
# Dev fallback: DATABASE_URL env var, or SQLite.
if config('DB_NAME', default=None):
    DATABASES = {
        'default': {
            'ENGINE': config('DB_ENGINE', default='django.db.backends.postgresql'),
            'NAME': config('DB_NAME'),
            'USER': config('DB_USER', default=''),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='db'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
            'OPTIONS': {
                'connect_timeout': 10,
            },
        }
    }
else:
    DATABASES = {
        'default': dj_database_url.config(
            default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# ── Redis Cache ───────────────────────────────────────────────
REDIS_URL = config('REDIS_URL', default='redis://redis:6379/0')

CACHES = {
    'default': {
        # django-redis (now in requirements.txt) — supports CLIENT_CLASS,
        # connection pooling, and Celery result back-end correctly.
        # The built-in django.core.cache.backends.redis.RedisCache does NOT
        # accept CLIENT_CLASS and would throw TypeError on every cache hit,
        # crashing all throttled DRF endpoints (including /auth/login/) with 500.
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'SOCKET_CONNECT_TIMEOUT': 5,
            'SOCKET_TIMEOUT': 5,
            'IGNORE_EXCEPTIONS': True,  # Cache errors degrade gracefully instead of 500-ing
        },
        'TIMEOUT': 300,
    }
}

# ── Celery ────────────────────────────────────────────────────
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = 'django-db'
CELERY_RESULT_EXTENDED = True
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kathmandu'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files
# In production, media is served by the frontend Nginx (shared Docker volume).
# Set MEDIA_URL env var to the frontend domain so DRF builds correct image URLs.
# e.g. MEDIA_URL=https://construction.nishanaweb.cloud/media/
MEDIA_URL = config('MEDIA_URL', default='/media/')
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom User Model
AUTH_USER_MODEL = 'accounts.User'

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        # Cloud traffic includes dashboard polling, mobile sync, chat refresh,
        # location updates, and gallery requests. Keep login protection separate
        # and give the general API a much higher ceiling by default.
        'anon': config('DRF_ANON_THROTTLE_RATE', default='3000/day'),
        'user': config('DRF_USER_THROTTLE_RATE', default='20000/day'),
        # Auth-specific: login has its own in-process throttle (views.py).
        # password_reset is used by PasswordResetThrottle (accounts/throttles.py).
        'password_reset': config('DRF_PASSWORD_RESET_THROTTLE_RATE', default='10/hour'),
    }
}

# Simple JWT settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=60, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=1440, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# CORS settings
# Default False — production must set CORS_ALLOWED_ORIGINS explicitly.
# Set CORS_ALLOW_ALL_ORIGINS=True only in local dev .env for LAN/ESP32 access.
CORS_ALLOW_ALL_ORIGINS = config('CORS_ALLOW_ALL_ORIGINS', default=False, cast=bool)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://localhost:5173,http://localhost:5174',
    cast=Csv()
)
CORS_ALLOW_CREDENTIALS = True

# Email Settings
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='webmaster@localhost')

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = config('FILE_UPLOAD_MAX_MEMORY_SIZE', default=52428800, cast=int)
DATA_UPLOAD_MAX_MEMORY_SIZE = config('DATA_UPLOAD_MAX_MEMORY_SIZE', default=52428800, cast=int)

# ── Logging ───────────────────────────────────────────────────
# All errors (including 500s) go to stderr → captured by Docker / systemd logs.
# Run: docker logs construction_backend --tail=200 --follow
#
# In production (LOG_FORMAT=json) each line is a single JSON object:
#   {"time":"…","level":"ERROR","logger":"…","message":"…","request_id":"…"}
# This makes it easy to query in Datadog, CloudWatch, Loki, etc.
# In development (LOG_FORMAT=text, the default) logs are human-readable.
_LOG_FORMAT = config('LOG_FORMAT', default='text')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'filters': {
        'request_id': {
            '()': 'utils.request_id_middleware.RequestIdFilter',
        },
    },
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {module} {process:d} rid={request_id} | {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {message}',
            'style': '{',
        },
        # Structured JSON formatter — no extra dependency needed.
        # Fields: time, level, logger, module, process, request_id, message
        'json': {
            '()': 'utils.json_log_formatter.JsonFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json' if _LOG_FORMAT == 'json' else 'verbose',
            'filters': ['request_id'],
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        # django.request logs full tracebacks for 500 errors — critical for debugging
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
        # Our app loggers
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'utils': {
            'handlers': ['console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}

# Spectacular API Documentation Settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Construction Management API',
    'DESCRIPTION': 'API documentation for the Construction Management System backend',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}
