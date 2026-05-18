# Full Development & Deployment Workflow

**Project:** ConstructPro — House Construction Management System
**Last updated:** 2026-05-18

This document explains exactly how to work on this project day-to-day — from writing code on your laptop to seeing it live on the server.

---

## Table of Contents

1. [How the System is Set Up](#1-how-the-system-is-set-up)
2. [First Time Setup](#2-first-time-setup)
3. [Daily Development Workflow](#3-daily-development-workflow)
4. [Branch Strategy](#4-branch-strategy)
5. [Making Backend Changes](#5-making-backend-changes)
6. [Making Frontend Changes](#6-making-frontend-changes)
7. [Database Migrations](#7-database-migrations)
8. [How CI/CD Works](#8-how-cicd-works)
9. [Deploying to Production](#9-deploying-to-production)
10. [Common Scenarios](#10-common-scenarios)
11. [Production Server Management](#11-production-server-management)
12. [Database Backup & Restore](#12-database-backup--restore)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. How the System is Set Up

```
Your Laptop                    GitHub                    VPS (nishanaweb.cloud)
─────────────────              ──────────                ──────────────────────────
Code editor                    Repository                6 Docker containers:
Local dev server    ──push──►  CI runs tests  ──SSH──►  • construction_backend
SQLite (local DB)              If main branch            • construction_frontend
                               → auto deploy             • construction_db (PostgreSQL)
                                                         • construction_redis
                                                         • construction_celery
                                                         • construction_celery_beat
```

**Two ways to run locally:**

| Mode | Command | Uses | Best for |
|------|---------|------|---------|
| No Docker (fast) | `make local` | SQLite, Python venv | Daily development |
| Docker dev stack | `make dev` | PostgreSQL, Redis | Testing prod-like setup |

**Live URLs:**

| | URL |
|---|---|
| Production frontend | https://construction.nishanaweb.cloud |
| Production API | https://api.construction.nishanaweb.cloud/api/v1 |
| Local frontend | http://localhost:5173 |
| Local backend | http://localhost:8000/api/v1 |
| Local admin | http://localhost:8000/admin |

---

## 2. First Time Setup

Do this once when you clone the project for the first time.

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/construction-platform.git
cd construction-platform

# First-time setup — creates Python venv, installs all deps, seeds admin user
make local-setup
```

That's it. Now run:

```bash
make local
```

Open http://localhost:5173 and log in with:
- **Email:** admin@gmail.com
- **Password:** adminpass

---

## 3. Daily Development Workflow

Every day you start work:

```bash
# 1. Pull latest changes from GitHub
git pull origin main

# 2. Start local dev server (backend + frontend together)
make local

# 3. Open http://localhost:5173 — start coding
```

When you're done:

```bash
# Stop the dev server
Ctrl+C
```

---

## 4. Branch Strategy

**The golden rule: never commit directly to `main`.**

`main` = production. Anything merged into `main` will auto-deploy to your live server.

```
main          ← production, always stable, auto-deploys
  │
  ├── dev     ← integration branch (optional), tests only
  │
  ├── feature/workforce-routes    ← your daily work happens here
  ├── feature/dashboard-kpis
  ├── fix/login-401-bug
  └── hotfix/critical-crash       ← urgent fixes
```

### Starting new work

```bash
# Always branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature-name

# Start coding...
```

### Naming your branch

| Type | Format | Example |
|------|--------|---------|
| New feature | `feature/short-name` | `feature/workforce-routes` |
| Bug fix | `fix/what-you-fixed` | `fix/login-401-bug` |
| Urgent fix | `hotfix/description` | `hotfix/payment-crash` |
| Cleanup | `chore/description` | `chore/remove-legacy-finance` |

### Saving your work (push to GitHub)

```bash
# Save your work — tests run, NO deploy
git add .
git commit -m "feat: add workforce member list page"
git push origin feature/my-feature-name
```

Push as often as you want on a feature branch. CI will run tests but will **never deploy** unless it's `main`.

---

## 5. Making Backend Changes

### Adding a new API endpoint

```bash
# 1. Make sure you're on a feature branch
git checkout -b feature/new-endpoint

# 2. Edit your app (e.g. apps/workforce/views.py)
# 3. If you added a new model, create a migration
make mm         # shortcut for makemigrations (local venv)
make ml         # shortcut for migrate (local venv)

# 4. Start local server and test it
make local

# 5. Commit and push
git add .
git commit -m "feat: add workforce evaluation endpoint"
git push origin feature/new-endpoint
```

### Modifying an existing model

```bash
# 1. Edit the model in apps/your_app/models/...
# 2. Create a migration
make mm APP=workforce   # only for the workforce app
make ml                 # apply it

# 3. Test locally
make local
```

### Running tests locally

```bash
cd backend
source venv/bin/activate
pytest                          # run all tests
pytest apps/accounts/           # run tests for one app
pytest -k "test_login"          # run tests matching a name
```

---

## 6. Making Frontend Changes

### Editing an existing page

```bash
# 1. Start local dev server
make local

# 2. Edit files in frontend/src/
#    Changes appear instantly in the browser (hot reload)

# 3. Commit when happy
git add .
git commit -m "feat: improve finance dashboard layout"
git push origin feature/my-branch
```

### Adding a new page

```bash
# 1. Create your page file
# e.g. frontend/src/pages/workforce/MemberList.jsx

# 2. Add it to the router
# frontend/src/routes/ — add your route

# 3. Test in browser at http://localhost:5173

# 4. Commit and push
git add .
git commit -m "feat: add workforce member list page"
git push origin feature/workforce-routes
```

### Checking for build errors before pushing

```bash
cd frontend
npm run build    # if this passes, CI will pass too
npm run lint     # check for lint errors
```

---

## 7. Database Migrations

Migrations are how Django tracks changes to your database schema. Every time you add/change a model, you need a migration.

### Local workflow (no Docker)

```bash
make mm             # creates migration files
make ml             # applies them to local SQLite

# Or both at once:
make m-local
```

### Local workflow (with Docker)

```bash
make makemigrations     # creates migration files
make migrate            # applies them to Docker PostgreSQL
```

### Rules for migrations

| Rule | Why |
|------|-----|
| Always commit migration files to git | Other developers and the server need them |
| Never delete migration files | Breaks migration history |
| One migration per logical change | Easier to debug and roll back |
| Test migrations locally before pushing | Catch errors before they hit production |

### After pulling code that has new migrations

```bash
git pull origin main
make ml         # apply any new migrations locally
```

---

## 8. How CI/CD Works

When you push code to GitHub:

```
Push to feature branch
    → Tests run (backend + frontend)
    → No deploy
    → You see ✅ or ❌ in GitHub Actions tab

Push/merge to main
    → Tests run
    → If tests pass → auto-deploy to VPS
    → If tests fail → deploy is blocked, server unchanged
```

### What the tests check

**Backend:**
- `python manage.py check` — no Django configuration errors
- `python manage.py migrate` — all migrations apply cleanly  
- `pytest` — all unit tests pass

**Frontend:**
- `npm run build` — Vite compiles without errors
- `npm run lint` — ESLint (non-blocking for now)

### Watching CI run

1. Push your code
2. Go to **GitHub → your repo → Actions tab**
3. You'll see your workflow running live

A green checkmark ✅ means everything passed. A red ✗ means something failed — click into it to see the error.

---

## 9. Deploying to Production

### Automatic deploy (normal way)

```bash
# When your feature is ready:
git checkout main
git pull origin main
git merge feature/my-feature
git push origin main
# → CI tests run → if green → auto-deploys to nishanaweb.cloud
```

Takes about 3–5 minutes. You can watch it in the GitHub Actions tab.

### Manual deploy from GitHub (no code change)

Useful when you changed an env variable on the server, or just want to redeploy:

1. Go to **GitHub → Actions → CI/CD**
2. Click **Run workflow**
3. Select `yes` for deploy
4. Click **Run workflow**

### Manual deploy from your terminal (old way, still works)

```bash
make full-deploy    # pushes code + SSHes into server + builds + restarts
```

Or step by step:

```bash
make deploy         # step 1: push code to GitHub
make server-deploy  # step 2: SSH in, build, migrate, restart
```

### What happens during deploy

On the VPS, these commands run automatically:

```bash
git pull origin main        # get latest code
make build                  # rebuild Docker images
make up                     # start/restart containers
make migrate                # run any new migrations
make collectstatic          # gather static files
make ps                     # show container status
```

### Checking if deploy succeeded

```bash
make server-logs      # tail live backend logs from your terminal
make health           # hit /api/v1/health/ endpoint
```

---

## 10. Common Scenarios

### Scenario A: Add a new feature (normal)

```bash
git checkout main && git pull origin main
git checkout -b feature/new-thing
# ... write code ...
make mm && make ml          # if you changed models
git add . && git commit -m "feat: add new thing"
git push origin feature/new-thing
# → CI runs tests, check GitHub Actions
# When ready to go live:
git checkout main
git merge feature/new-thing
git push origin main
# → Auto-deploys
```

### Scenario B: Fix a bug on the live site (hotfix)

```bash
git checkout main && git pull origin main
git checkout -b hotfix/crash-on-login
# ... fix the bug ...
git add . && git commit -m "fix: resolve login crash"
git push origin hotfix/crash-on-login
# Check CI passes, then:
git checkout main
git merge hotfix/crash-on-login
git push origin main
# → Auto-deploys immediately
```

### Scenario C: Test a change without deploying

```bash
git checkout -b experiment/new-layout
# ... try things ...
git push origin experiment/new-layout
# CI tests run but NOTHING deploys — safe to experiment
# If you don't want it: just delete the branch
git branch -d experiment/new-layout
git push origin --delete experiment/new-layout
```

### Scenario D: Deploy is broken, roll back

```bash
make rollback       # reverts VPS to previous Docker image tag
```

### Scenario E: New developer joins the project

```bash
git clone https://github.com/YOUR_USERNAME/construction-platform.git
cd construction-platform
make local-setup        # creates venv, installs deps, seeds admin
make local              # start dev server
# Open http://localhost:5173 → login → ready to work
```

### Scenario F: Run only the backend (API work)

```bash
make local-backend      # only Django, port 8000
```

### Scenario G: Run only the frontend (UI work)

```bash
make local-frontend     # only Vite, port 5173
```

---

## 11. Production Server Management

All these commands SSH into the server automatically.

```bash
make server-logs            # tail live backend logs
make server-shell           # open Django shell on production
make server-admin-fix       # create or update superuser on production
make server-admin-password  # change a user's password on production
make showmigrations-remote  # check migration status on production
make migrate-remote         # run migrations on production only
```

### Rebuild only one service (faster)

```bash
make server-deploy-service SERVICE=backend    # rebuild backend only
make server-deploy-service SERVICE=frontend   # rebuild frontend only
make server-deploy-service SERVICE=celery     # rebuild celery only
```

### Emergency: force-add a missing column

```bash
make server-db-heal     # adds missing columns without full migration
```

### Nuclear option: wipe and rebuild production DB

```bash
make server-db-reset    # ⚠️ DESTRUCTIVE — deletes all data
```

---

## 12. Database Backup & Restore

### Backup production database

```bash
make db-pull        # downloads a backup from the VPS to ./backups/
```

### Backup local Docker database

```bash
make db-backup      # saves to backups/db_TIMESTAMP.sql.gz
```

### Restore local database

```bash
make db-restore FILE=backups/db_20260518_120000.sql.gz
```

### Push local data to production (dangerous)

```bash
make db-push FILE=backups/db_20260518_120000.sql.gz
# ⚠️ This overwrites production data — only use for initial seeding
```

### List all backups

```bash
make db-list
```

---

## 13. Troubleshooting

### Local server won't start

```bash
make reset-local    # wipe everything and start fresh (safe — local only)
make local-setup    # reinstall venv if it's broken
```

### Migration error locally

```bash
make showmigrations-local   # see what's applied and what's pending
make reset-local            # nuclear option: wipe local DB and remigrate
```

### Production migration fails after deploy

```bash
make server-logs            # read the error
make showmigrations-remote  # see migration state on server

# If columns already exist but migration history is missing:
make migrate-fake-initial

# If migration file has a real error:
# 1. Fix the migration file
# 2. git add . && git commit && git push origin main
# 3. CI will redeploy automatically
```

### Production containers are down

```bash
make server-logs        # check what crashed
make up                 # restart all containers
make ps                 # verify they're running
```

### Tests fail in CI but pass locally

Common causes:
- Missing migration file (run `make mm` and commit)
- Env variable missing in CI (check `backend/.env.example`)
- Import error (run `python manage.py check` locally)

### Frontend build fails in CI

```bash
cd frontend
npm run build       # reproduce the error locally
npm run lint        # check for lint errors
```

---

## Quick Reference Card

```
START WORK
  git checkout main && git pull
  git checkout -b feature/name
  make local

WRITE CODE
  make mm && make ml      ← if you changed a model
  Ctrl+C && make local    ← restart after backend changes
  browser auto-reloads    ← for frontend changes

SAVE PROGRESS (no deploy)
  git add . && git commit -m "feat: description"
  git push origin feature/name

DEPLOY TO PRODUCTION
  git checkout main
  git merge feature/name
  git push origin main    ← tests run → auto-deploys if green

CHECK PRODUCTION
  make server-logs        ← live logs
  make health             ← quick health check
  make ps                 ← container status
```
