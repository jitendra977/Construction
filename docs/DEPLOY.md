# HCMS — Production Deployment Guide
### पूर्ण डिप्लोयमेन्ट गाइड (Nepali + English)

**Live Site:** https://construction.nishanaweb.cloud  
**API:** https://api.construction.nishanaweb.cloud/api/v1  
**Server:** nishanaweb.cloud (VPS)  
**Stack:** Django 4.2 + React 18 + PostgreSQL 16 + Redis 7 (Docker Compose)

---

## ⚡ Quick Deploy (एक कमान्डमा डिप्लोय)

```bash
# From your local machine — project root
make deploy
```

यो कमान्डले:
1. Code push → git push origin main
2. SSH into VPS → git reset --hard (clean pull)
3. Docker images rebuild
4. Database migrations run
5. Static files collect
6. Containers restart

---

## 🏗 First-Time Server Setup (पहिलो पटक सेटअप)

### 1. SSH into VPS
```bash
ssh nishanaweb@nishanaweb.cloud
```

### 2. Clone the repo
```bash
mkdir -p /home/nishanaweb/project
cd /home/nishanaweb/project
git clone https://github.com/YOUR_REPO/Construction.git
cd Construction
```

### 3. Create backend `.env` ⚠️ CRITICAL — NOT IN GIT
```bash
nano backend/.env
```

Paste and fill in all values (see template below):

```env
# ── Django Core ──────────────────────────────────────────────
SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(50))">
DEBUG=False
DJANGO_ENV=production
ALLOWED_HOSTS=api.construction.nishanaweb.cloud,construction.nishanaweb.cloud,nishanaweb.cloud,localhost,127.0.0.1

# ── CORS & CSRF ───────────────────────────────────────────────
CORS_ALLOWED_ORIGINS=https://construction.nishanaweb.cloud,https://nishanaweb.cloud
CSRF_TRUSTED_ORIGINS=https://api.construction.nishanaweb.cloud,https://construction.nishanaweb.cloud

# ── Database (PostgreSQL) ─────────────────────────────────────
DB_ENGINE=django.db.backends.postgresql
DB_NAME=constructpro
DB_USER=constructpro
DB_PASSWORD=<strong-password>
DB_HOST=db
DB_PORT=5432

# ── Redis ─────────────────────────────────────────────────────
REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379/0
REDIS_PASSWORD=<strong-redis-password>

# ── JWT ───────────────────────────────────────────────────────
JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

# ── Email (SMTP) ──────────────────────────────────────────────
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
```

### 4. Create root `.env` (Docker Compose vars)
```bash
nano .env
```

```env
# Docker Compose + Deploy scripts
VITE_API_URL=https://api.construction.nishanaweb.cloud/api/v1
DB_NAME=constructpro
DB_USER=constructpro
DB_PASSWORD=<same as backend/.env>
REDIS_PASSWORD=<same as backend/.env>
VPS_HOST=nishanaweb.cloud
VPS_USER=nishanaweb
DEPLOY_BRANCH=main
IMAGE_TAG=latest
IMAGE_TAG_PREV=latest
```

### 5. Create Docker network (one time)
```bash
docker network create app-network
```

### 6. First deploy
```bash
make deploy
```

---

## 🔄 Day-to-Day Deploy (रोजको डिप्लोय)

```bash
# Full deploy (code + rebuild + migrate + restart)
make deploy

# Quick update — pull + rebuild + migrate only (faster)
make update
```

---

## ⚠️ Manual Steps After Domain Change

जब API domain परिवर्तन हुन्छ (जस्तै `backend.nishanaweb.cloud` → `api.construction.nishanaweb.cloud`):

1. **Update server `backend/.env`** (gitignored — must do manually):
   ```bash
   ssh nishanaweb@nishanaweb.cloud
   nano /home/nishanaweb/project/Construction/backend/.env
   # Update ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
   ```

2. **Restart backend container:**
   ```bash
   cd /home/nishanaweb/project/Construction
   docker compose -f docker-compose.prod.yml restart backend
   ```

3. **Update Nginx Proxy Manager** — point new subdomain to backend container port.

---

## 🔐 .gitignore — के commit हुँदैन (What is NOT in git)

| File | Reason |
|------|--------|
| `backend/.env` | Production secrets (DB password, secret key, SMTP) |
| `.env` | Root-level Docker Compose secrets |
| `frontend/.env` | Frontend API URL (set per-environment) |
| `backend/config/settings_local.py` | Local dev SQLite override |
| `db.sqlite3` | Local development database |
| `deploy.log` | Deploy output log |
| `docker-compose.dev.yml` | Local Docker dev stack |
| `media/` | User-uploaded files |
| `staticfiles/` | Collected static (generated) |

> **Rule:** Secrets, generated files, and local-only configs are never committed.

---

## 🩺 Health & Logs (स्वास्थ्य जाँच)

```bash
# Container status
make status

# Tail all logs
make logs

# Backend logs only
make logs-backend

# Health check
curl https://api.construction.nishanaweb.cloud/api/v1/health/

# Django shell (inside container)
make shell

# Database backup
make db-backup
```

---

## 🔁 Rollback (अघिल्लो version मा फर्कने)

```bash
make rollback
# OR
./scripts/deploy.sh --rollback
```

This restores the previous Docker image tag stored in `.env` as `IMAGE_TAG_PREV`.

---

## 🐛 Common Errors & Fixes (सामान्य त्रुटि)

### `Bad Request (400)` on admin or API
**Cause:** New domain not in `ALLOWED_HOSTS` / `CSRF_TRUSTED_ORIGINS`  
**Fix:**
```bash
ssh nishanaweb@nishanaweb.cloud
nano /home/nishanaweb/project/Construction/backend/.env
# Add domain to ALLOWED_HOSTS and CSRF_TRUSTED_ORIGINS
docker compose -f docker-compose.prod.yml restart backend
```

### `SyntaxError: invalid syntax` in migration (conflict markers)
**Cause:** `git stash pop` re-applied a conflicted file over a clean pull  
**Fix:**
```bash
ssh nishanaweb@nishanaweb.cloud
cd /home/nishanaweb/project/Construction
git config --global --add safe.directory $(pwd)
git reset --hard origin/main
git clean -fd
make deploy
```
> The deploy script now uses `git reset --hard` instead of stash/pop — this cannot happen on future deploys.

### `Cannot connect to the Docker daemon`
**Cause:** Docker Desktop not running (local machine)  
**Fix:** Open Docker Desktop, wait for it to start.

### `make migrate` → `No rule to make target`
**Cause:** Running `make` from `backend/` — Makefile is in the project root  
**Fix:**
```bash
cd ..   # go to Construction/
make migrate
```

### Local `python manage.py migrate` → PostgreSQL timeout
**Cause:** Missing `DJANGO_SETTINGS_MODULE` — uses production settings  
**Fix:**
```bash
DJANGO_SETTINGS_MODULE=config.settings_local python manage.py migrate
```

### `ModuleNotFoundError: No module named 'celery'`
**Cause:** Local venv predates new dependencies  
**Fix:**
```bash
cd backend
pip install -r requirements.txt
```

---

## 🐳 Production Container Overview

| Container | Image | Role |
|-----------|-------|------|
| `construction_db` | postgres:16-alpine | PostgreSQL database |
| `construction_redis` | redis:7-alpine | Cache + Celery broker |
| `construction_backend` | constructpro-backend | Django + Gunicorn |
| `construction_frontend` | constructpro-frontend | React + Nginx |
| `construction_celery` | constructpro-backend | Celery worker |
| `construction_celery_beat` | constructpro-backend | Celery scheduler |

Routed via **Nginx Proxy Manager** on shared `app-network`:
- `construction.nishanaweb.cloud` → `construction_frontend:80`
- `api.construction.nishanaweb.cloud` → `construction_backend:8000`

---

## 👨‍💻 Developer

**Jitendra Khadka** — jitendrakhadka4@gmail.com  
© 2026 — Private & Proprietary
