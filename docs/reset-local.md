# `reset-local` — Full Local Database Reset

> **Script:** `scripts/reset_local_db.sh`
> **Make alias:** `make reset-local`
> **Purpose:** Completely wipe all Django migrations and the local SQLite database, then rebuild everything from scratch with fresh migrations, a superuser, and fully seeded demo data.

---

## Table of Contents

1. [Overview](#overview)
2. [When to Use](#when-to-use)
3. [Prerequisites](#prerequisites)
4. [How to Run](#how-to-run)
5. [What the Script Does — Step by Step](#what-the-script-does--step-by-step)
6. [Apps Covered by makemigrations](#apps-covered-by-makemigrations)
7. [Superuser Credentials](#superuser-credentials)
8. [Environment Variables](#environment-variables)
9. [Script Source Structure](#script-source-structure)
10. [Seed Commands Reference](#seed-commands-reference)
11. [After Reset — Next Steps](#after-reset--next-steps)
12. [Troubleshooting](#troubleshooting)
13. [Related Commands](#related-commands)

---

## Overview

`reset-local` is a **destructive, full-reset** utility for the local development environment. It does **not** touch Docker, PostgreSQL, or any production infrastructure. It operates entirely on the local SQLite database and the Django app migration files stored in `backend/apps/`.

Use it whenever your local database or migration state becomes inconsistent, corrupt, or out of sync with the current models.

---

## When to Use

| Situation | Use `reset-local`? |
|---|---|
| Migration conflict or `InconsistentMigrationHistory` error | ✅ Yes |
| Model changes that break existing migrations | ✅ Yes |
| Fresh onboarding / first-time local setup | ✅ Yes |
| Corrupt or mismatched `db.sqlite3` | ✅ Yes |
| Just need to re-seed data (no migration issues) | ❌ Use `make seed` instead |
| Running production or Docker stack | ❌ Not applicable |

---

## Prerequisites

Before running `reset-local`, the following must be in place:

- **Python virtual environment** exists at `backend/venv/`
  - If missing, run `make local-setup` first — this creates the venv and installs all dependencies.
- **Script is being run from the project root** (the Makefile handles this automatically).
- The `backend/apps/` directory contains the Django app folders.

The script will exit immediately with an error if the venv is not found:

```
✖  No venv found at /path/to/backend/venv/bin/activate
     Run first:  make local-setup
```

---

## How to Run

**Recommended (via Makefile):**

```bash
make reset-local
```

**Direct (from project root):**

```bash
bash scripts/reset_local_db.sh
```

---

## What the Script Does — Step by Step

### Step 1 — Guard Check

Verifies that the Python virtual environment exists at `backend/venv/bin/activate`. If it does not exist, the script exits with a clear error message directing you to run `make local-setup` first.

```bash
if [ ! -f "$VENV" ]; then
    err "No venv found at $VENV"
    exit 1
fi
```

### Step 2 — Activate venv and Set Django Settings

Activates the local virtual environment and sets `DJANGO_SETTINGS_MODULE` to `config.settings_local`, which points Django at the local SQLite configuration rather than the production PostgreSQL/Redis stack.

```bash
source backend/venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings_local
```

### Step 3 — Delete All Migration Files

Removes every `.py` and `.pyc` migration file from every app under `backend/apps/`, **except** `__init__.py` (which must remain for Python package discovery).

```bash
find backend/apps -path "*/migrations/*.py" ! -name "__init__.py" -delete
find backend/apps -path "*/migrations/*.pyc" -delete
```

This ensures Django regenerates clean migration files with no history or conflicts.

### Step 4 — Delete the SQLite Database

Removes `db.sqlite3` and all associated journal and WAL files, giving Django a completely blank slate.

Files deleted:
- `backend/db.sqlite3`
- `backend/db.sqlite3-journal`
- `backend/db.sqlite3-wal`
- `backend/db.sqlite3-shm`

### Step 5 — Run `makemigrations` for Every App

Iterates through all registered Django apps and runs `python manage.py makemigrations <app>` for each one. Apps that do not have a directory under `backend/apps/` are silently skipped.

Output per app:
- `✓ <app>` — new migration file created
- `~ <app> (no changes)` — app has no model changes, skipped

### Step 6 — Run `migrate`

Applies all freshly generated migrations to the new empty SQLite database:

```bash
python manage.py migrate --run-syncdb --noinput
```

The `--run-syncdb` flag ensures that any apps without explicit migrations (e.g. third-party apps) still get their tables created.

### Step 7 — Create Superuser

Creates the local admin account using a Django shell script. The logic is safe to re-run — if the account already exists, it skips creation without erroring.

The superuser creation is flexible — it inspects the custom `User` model for optional fields (`username`, `first_name`, `last_name`) and only sets them if they exist on the model.

Default credentials (can be overridden via environment variables — see [Environment Variables](#environment-variables)):

| Field | Default Value |
|---|---|
| Email | `admin@gmail.com` |
| Password | `adminpass` |

### Step 8 — Full Seed

Runs the Django management command `seed_all`, which populates the database with demo data across all modules:

```bash
python manage.py seed_all
```

This covers projects, attendance records, resources, teams, and workforce data — giving the local environment a realistic, working dataset immediately after reset.

---

## Apps Covered by `makemigrations`

The script runs `makemigrations` for the following apps (skipping any that don't have a directory under `backend/apps/`):

| App | Description |
|---|---|
| `accounts` | User accounts, authentication, roles, worker portal |
| `core` | Shared core models, project membership |
| `attendance` | QR-based attendance tracking, scan windows |
| `resource` | Resource management (singular) |
| `resources` | Resource management (plural variant) |
| `finance` | Financial records |
| `fin` | Finance module (clean implementation) |
| `accounting` | Accounting / ledger |
| `tasks` | Task management |
| `estimate` | Project estimation |
| `estimator` | Estimator module variant |
| `permits` | Permits and approvals |
| `photo_intel` | Photo intelligence / media |
| `analytics` | Analytics and reporting |
| `assistant` | AI assistant integration |
| `workforce` | Workforce management — members, teams, payroll, evaluations |
| `data_transfer` | Import / export data transfer |

> **Note:** `apps.teams` was merged into `apps.workforce` — the `Team` model now lives at  
> `apps/workforce/models/team.py` and uses `WorkforceMember` FKs.

---

## Superuser Credentials

After a successful reset, a local superuser is available at:

| | Value |
|---|---|
| **URL** | `http://localhost:8000/admin` |
| **Email** | `admin@gmail.com` |
| **Password** | `adminpass` |

These are development-only defaults. Override them using environment variables before running the script (see below).

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `LOCAL_ADMIN_EMAIL` | `admin@gmail.com` | Email address for the local superuser |
| `LOCAL_ADMIN_PASS` | `adminpass` | Password for the local superuser |

**Example — custom credentials:**

```bash
LOCAL_ADMIN_EMAIL=me@example.com LOCAL_ADMIN_PASS=mysecret make reset-local
```

Never set these to real production credentials. This script is for local development only.

---

## Script Source Structure

```
scripts/reset_local_db.sh
│
├── Colour helpers (ok, info, warn, err, hr)
├── Guard: venv must exist
├── cd backend && source venv
├── export DJANGO_SETTINGS_MODULE=config.settings_local
│
├── Step 1 — delete migration .py files (keep __init__.py)
├── Step 2 — delete db.sqlite3 + WAL/journal files
├── Step 3 — loop: makemigrations for each app
├── Step 4 — migrate --run-syncdb
├── Step 5 — shell: create superuser if not exists
└── Step 6 — manage.py seed_all
```

**Key variables set at the top of the script:**

```bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"   # Project root (resolved)
BACKEND="$ROOT/backend"                    # Backend directory
VENV="$BACKEND/venv/bin/activate"          # Virtual environment path
```

---

## Seed Commands Reference

The project has two levels of seeding — the full-stack seed that runs as part of `reset-local`, and targeted per-module seeds you can run independently at any time.

### Full seed (runs automatically inside `reset-local`)

```bash
python manage.py seed_all
```

Populates all modules in the correct dependency order: project → attendance → resources → workforce members → teams.

```bash
make seed          # Re-run seed_all without touching migrations or DB
```

---

### Workforce module seed (`workforce_seeds`)

Seeds **all workforce models** independently. Use this when you want realistic workforce data without wiping the whole database.

**What it seeds:**

| Step | Models | Data |
|---|---|---|
| 1 | `WorkforceCategory`, `WorkforceRole`, `Skill` | 7 categories, 17 roles, 18 skills |
| 2 | `WorkforceMember` | 15 realistic Nepali workers (masons, helpers, engineers, etc.) |
| 3 | `WageStructure`, `WorkerContract` | Daily wage or monthly salary + active contract per worker |
| 4 | `WorkerSkill` | 2–3 trade-relevant skills per worker |
| 5 | `EmergencyContact` | One primary contact per worker |
| 6 | `WorkerAssignment` | One project assignment per worker |
| 7 | `PayrollRecord` | Last 2 months of payroll (approved / paid) |
| 8 | `WorkerEvaluation` | Evaluations for ~60% of members |
| 9 | `SafetyRecord` | 5 realistic site incidents |
| 10 | `PerformanceLog` | 2 performance log entries per worker |
| 11 | `Team` | 3 teams (Civil Works, MEP & Finishing, Site Supervision) |

**Commands:**

```bash
# Seed — appends to existing data (idempotent, uses get_or_create)
make seed-workforce

# Wipe all workforce data first, then re-seed from scratch
make seed-workforce-clear

# Run inside the running Docker backend container
make seed-workforce-docker
```

**Direct management command:**

```bash
cd backend
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings_local

# Basic
python manage.py workforce_seeds

# Clear then seed
python manage.py workforce_seeds --clear

# Target a specific project by ID
python manage.py workforce_seeds --project <uuid>

# Only create WorkforceMembers — skip payroll, evaluations, etc.
python manage.py workforce_seeds --members-only
```

**Source:** `backend/apps/workforce/management/commands/workforce_seeds.py`

---

### Seed dependency order

```
seed_jitu_project          ← creates HouseProject + phases + floors + rooms
  └─ seed_attendance       ← creates AttendanceWorker + QR scan windows
       └─ seed_resources   ← contractors, suppliers, materials
            └─ seed_workforce_members  ← WorkforceMember records
                 └─ seed_teams         ← Team records (leader must exist first)

workforce_seeds            ← standalone, covers ALL workforce sub-models
                              (runs seed_jitu_project first if no project exists)
```

---

## After Reset — Next Steps

Once `reset-local` completes successfully, start the development server:

```bash
make local           # Start both backend + frontend
# — or —
make local-backend   # Backend only (port 8000)
make local-frontend  # Frontend only (port 5173)
```

Access points after startup:

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:8000/api/v1` |
| Django Admin | `http://localhost:8000/admin` |

---

## Troubleshooting

**`No venv found` error**

```
✖  No venv found at .../backend/venv/bin/activate
```

Run `make local-setup` first to create the virtual environment and install all Python dependencies.

---

**`ModuleNotFoundError` during makemigrations**

A dependency is missing from the venv. Re-run setup:

```bash
make local-setup
```

---

**`CommandError: App 'X' has no migrations folder`**

The migrations directory is missing entirely (not just the files). Create it:

```bash
mkdir -p backend/apps/<appname>/migrations
touch backend/apps/<appname>/migrations/__init__.py
```

Then re-run `make reset-local`.

---

**Seed fails with `Unknown command: 'seed_all'`**

The `seed_all` management command is not installed or the app containing it is not in `INSTALLED_APPS` in `config/settings_local.py`. Check that all custom apps are registered.

---

**Permission denied running the script**

```bash
chmod +x scripts/reset_local_db.sh
```

The Makefile runs `chmod +x` automatically before executing the script, so using `make reset-local` avoids this issue.

---

## Related Commands

### Setup & Reset

| Command | Description |
|---|---|
| `make local-setup` | First-time setup: create venv, install Python + Node deps |
| `make reset-local` | **This script** — full wipe + rebuild |
| `make mm` | Run `makemigrations` only (no reset) |
| `make migrate-local` | Run `migrate` only (no reset) |
| `make showmigrations-local` | Show current migration status |

### Running Locally

| Command | Description |
|---|---|
| `make local` | Start backend + frontend (no Docker, SQLite) |
| `make local-backend` | Start backend only (port 8000) |
| `make local-frontend` | Start frontend only (port 5173) |

### Seeding Data

| Command | Description |
|---|---|
| `make seed` | Re-seed all modules — no migration or DB wipe |
| `make seed-workforce` | Seed workforce module only (members, payroll, teams, etc.) |
| `make seed-workforce-clear` | Wipe workforce data then re-seed from scratch |
| `make seed-workforce-docker` | Seed workforce inside the running Docker container |

### Docker

| Command | Description |
|---|---|
| `make up ENV=dev` | Start Docker dev stack |
| `make migrate` | Run migrations in Docker |
| `make shell` | Open Django shell in Docker |
| `make db-backup` | Dump production DB to `backups/` |
