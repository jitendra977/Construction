# CI / CD Pipeline

**Last updated:** 2026-05-18
**Workflow file:** `.github/workflows/ci.yml`

Every push to GitHub runs tests automatically. Every push to `main` that passes tests auto-deploys to the VPS using SSH + Make.

---

## Pipeline Flow

```
git push (any branch)
        │
        ├──────────────────────────┐
        ▼                          ▼
  ┌─────────────┐          ┌──────────────┐
  │   Backend   │          │   Frontend   │
  │             │          │              │
  │ manage.py   │          │ npm install  │
  │   check     │          │ eslint       │
  │ migrate     │          │ vite build   │
  │ pytest      │          │              │
  └──────┬──────┘          └──────┬───────┘
         │     (run in parallel)  │
         └──────────┬─────────────┘
                    ▼
           branch = main AND both pass?
                    │
           ┌────────┴────────┐
           NO                YES
           ▼                 ▼
          stop        SSH → VPS
                        git pull origin main
                        make build
                        make up
                        make migrate
                        make collectstatic
                        make ps
```

---

## Real-World Workflow

**Never push directly to `main`.** Work on a feature branch, then merge when ready to deploy.

```bash
# 1. Start a new feature
git checkout -b feature/workforce-routes

# 2. Work, commit as many times as you want
git add .
git commit -m "feat: add workforce member list page"
# → CI runs tests only, no deploy. Safe to push freely.
git push origin feature/workforce-routes

# 3. When ready to deploy → merge to main
git checkout main
git merge feature/workforce-routes
git push origin main
# → CI tests pass → auto-deploy to VPS
```

Or use **GitHub Pull Requests**: open a PR from your branch → review → merge. CI runs on the PR, deploy fires on merge.

### Manual deploy (no code push needed)

Go to **GitHub → Actions → CI/CD → Run workflow** and click Run. Useful when you want to re-deploy the current `main` without changing any code (e.g. after a server restart or env var change).

---

## Branch Rules

| Branch | Tests run | Auto-deploys |
|--------|-----------|-------------|
| `main` | ✅ | ✅ on push/merge |
| `dev` | ✅ | ❌ |
| any PR → `main` | ✅ | ❌ (deploys only after merge) |
| manual trigger | ✅ | ✅ if you choose yes |

---

## CI Jobs

### Backend (Python 3.9)

| Step | Command | Purpose |
|------|---------|---------|
| Install | `pip install -r requirements-dev.txt` | Python deps including pytest |
| Check | `python manage.py check` | Catch config errors |
| Migrate | `python manage.py migrate --run-syncdb` | All migrations apply cleanly |
| Test | `pytest` | No regressions |

> Uses SQLite — no DB server needed. Settings fall back automatically when `DB_NAME` is not set.

### Frontend (Node 20)

| Step | Command | Purpose |
|------|---------|---------|
| Install | `npm install` | Node deps |
| Lint | `npm run lint` | ESLint (non-blocking until Phase 3) |
| Build | `npm run build` | Vite compiles without errors |

### Deploy (main only)

Runs only after both jobs above pass. SSHes into the VPS and runs:

```bash
cd /home/nishanaweb/project/Construction
git pull origin main
make build        # docker compose build --pull
make up           # docker compose up -d
make migrate      # manage.py migrate --noinput
make collectstatic
make ps           # show container status
```

---

## GitHub Secrets

Go to **GitHub repo → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `VPS_HOST` | `nishanaweb.cloud` |
| `VPS_USER` | `nishanaweb` |
| `VPS_SSH_KEY` | Full contents of `~/.ssh/id_rsa` (including `-----BEGIN` / `-----END` lines) |

---

## Make Commands — Reference

### Local development

```bash
make local            # start backend + frontend (no Docker, SQLite, hot reload)
make local-setup      # first-time: create venv + install all deps
make m-local          # makemigrations + migrate via local venv
make seed             # re-seed demo data
make reset-local      # wipe SQLite + migrations and rebuild from scratch
```

### Docker dev stack

```bash
make dev              # start Docker dev stack with hot reload
make dev-build        # rebuild images then start
make dev-down         # stop dev stack
make dev-logs         # tail dev logs
```

### Production (local → server)

```bash
make deploy           # push code to origin/main (local step)
make server-deploy    # SSH → pull + build + migrate + restart on VPS
make full-deploy      # push code then immediately server-deploy (combined)
make rollback         # roll back VPS to previous image tag
```

### Production (already on server / CI)

```bash
make build            # docker compose build --pull
make up               # docker compose up -d
make migrate          # manage.py migrate --noinput
make collectstatic    # manage.py collectstatic --noinput --clear
make restart          # restart all containers
make ps               # show running containers
make logs             # tail all logs
make logs-backend     # backend logs only
```

### Database

```bash
make db-backup        # dump DB → backups/db_TIMESTAMP.sql.gz
make db-restore FILE=backups/db_XXX.sql.gz
make db-pull          # download backup FROM server to ./backups/
make db-push FILE=backups/db_XXX.sql.gz   # upload + restore on server
make showmigrations   # list migration status (Docker)
make showmigrations-local                 # list migration status (local venv)
make migrate-remote   # run migrations on VPS only
```

### Maintenance

```bash
make shell            # Django shell in container
make bash             # bash in backend container
make health           # check /api/v1/health/ endpoint
make server-logs      # tail production backend logs (SSH)
make server-shell     # Django shell on VPS (SSH)
make env-check        # verify required .env vars are set
make clean            # prune stopped containers + dangling images
```

---

## Dev Dependencies

CI installs from `backend/requirements-dev.txt`:

```
-r requirements.txt
pytest==8.2.0
pytest-django==4.8.0
```

`backend/pytest.ini` sets `DJANGO_SETTINGS_MODULE = config.settings` so pytest finds Django automatically.

---

## Known Limitations (Phase 3)

| Issue | Fix |
|-------|-----|
| ESLint `continue-on-error: true` — 487 pre-existing errors | Clean up lint errors, remove `continue-on-error` |
| No test coverage threshold | Add `--cov` to pytest, enforce 60% minimum |
| `npm install` instead of `npm ci` | Commit `package-lock.json`, switch to `npm ci` |
