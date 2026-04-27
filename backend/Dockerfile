# ============================================================
#  ConstructPro Backend — Multi-stage Dockerfile
#  Stages: base → deps → production
# ============================================================

# ── Stage 1: base ─────────────────────────────────────────────
FROM python:3.11-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# System deps (PostgreSQL client + build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq-dev \
        build-essential \
        pkg-config \
        curl \
        # Keep mysql libs so existing mysqlclient install doesn't break
        default-libmysqlclient-dev \
        default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: deps (cached layer) ─────────────────────────────
FROM base AS deps

COPY requirements.txt .
RUN pip install --upgrade pip \
    && pip install -r requirements.txt

# ── Stage 3: production ───────────────────────────────────────
FROM deps AS production

# Copy source (after deps — so code changes don't bust dep cache)
COPY . .

RUN chmod +x /app/entrypoint.sh

# Static files baked into image (Whitenoise serves them).
# Use a dummy SECRET_KEY so Django can load settings during build
# (the real key comes from the .env file at runtime).
RUN SECRET_KEY=build-time-dummy-key-not-used-at-runtime \
    DB_NAME=dummy \
    DB_USER=dummy \
    DB_PASSWORD=dummy \
    python manage.py collectstatic --noinput

# Non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -fs http://localhost:8000/api/v1/health/ || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--worker-class", "gthread", \
     "--threads", "2", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
