# CI / CD Pipeline

**Last updated:** 2026-05-18

Every push to GitHub triggers the pipeline automatically. Tests run on all branches; deployment only fires on `main` after all tests pass.

---

## Pipeline Diagram

```
git push (any branch)
        │
        ├─────────────────────────┐
        ▼                         ▼
  ┌─────────────┐         ┌─────────────────┐
  │   Backend   │         │    Frontend     │
  │  (Python 3.9)│         │   (Node 20)    │
  │             │         │                 │
  │ • manage.py │         │ • npm install   │
  │   check     │         │ • ESLint        │
  │ • migrate   │         │   (non-block)   │
  │   (SQLite)  │         │ • vite build    │
  │ • pytest    │         │                 │
  └──────┬──────┘         └────────┬────────┘
         │                         │
         └──────────┬──────────────┘
                    ▼
           branch = main
           + both jobs pass?
                    │
           ┌────────┴────────┐
           │ NO              │ YES
           ▼                 ▼
          stop        ┌─────────────────┐
                      │  Deploy to VPS  │
                      │                 │
                      │ • SSH in        │
                      │ • git pull main │
                      │ • docker build  │
                      │ • migrate       │
                      │ • restart       │
                      └─────────────────┘
```

---

## Workflow File

Located at `.github/workflows/ci.yml`. Three jobs:

**`backend`** — runs on every push/PR

| Step | Command | What it checks |
|------|---------|----------------|
| Install deps | `pip install -r requirements-dev.txt` | All Python packages resolve |
| Django check | `python manage.py check` | No configuration errors |
| Migrate | `python manage.py migrate --run-syncdb` | All migrations apply cleanly |
| Tests | `pytest` | No regressions |

Uses SQLite — no PostgreSQL service needed in CI. Settings fall back automatically when `DB_NAME` is not set.

**`frontend`** — runs on every push/PR, in parallel with backend

| Step | Command | What it checks |
|------|---------|----------------|
| Install deps | `npm install` | All packages resolve |
| Lint | `npm run lint` | ESLint (non-blocking — pre-existing issues being cleaned up in Phase 3) |
| Build | `npm run build` | Vite compiles without errors |

**`deploy`** — runs only on push to `main`, only if both jobs above pass

| Step | What happens |
|------|-------------|
| SSH | Connects to `nishanaweb.cloud` using `VPS_SSH_KEY` secret |
| Pull | `git pull origin main` |
| Build | `docker compose -f docker-compose.prod.yml build --pull` |
| Migrate | `python manage.py migrate --noinput` inside the backend container |
| Restart | `docker compose -f docker-compose.prod.yml up -d` |

---

## GitHub Secrets Required

Go to **GitHub repo → Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `nishanaweb.cloud` |
| `VPS_USER` | `nishanaweb` |
| `VPS_SSH_KEY` | Contents of `~/.ssh/id_rsa` (full private key including header/footer) |

---

## Branch Strategy

| Branch | CI runs | Deploys |
|--------|---------|---------|
| `main` | ✅ | ✅ Auto-deploys if green |
| any other | ✅ | ❌ Never |

---

## Local vs CI Database

| Environment | Database | Config |
|------------|----------|--------|
| CI | SQLite (auto) | No `DB_NAME` set → settings.py fallback |
| Local dev | SQLite (auto) | `make local` uses `settings_local.py` |
| Production | PostgreSQL 16 | `DB_NAME` set in `.env` |

---

## Dev Dependencies

CI installs from `backend/requirements-dev.txt` which wraps `requirements.txt` and adds:

```
pytest==8.2.0
pytest-django==4.8.0
```

`pytest.ini` at `backend/pytest.ini` configures `DJANGO_SETTINGS_MODULE = config.settings` so pytest finds Django automatically.

---

## Known Limitations (to fix in Phase 3)

- ESLint is `continue-on-error: true` — 487 pre-existing errors need to be resolved before enforcement is turned back on.
- No test coverage threshold yet — target is 60% backend coverage by end of Phase 2.
- `npm install` is used instead of `npm ci` — commit `package-lock.json` to the repo and switch to `npm ci` for faster, reproducible installs.
