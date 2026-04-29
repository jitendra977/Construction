# 🐍 HCMS — Backend Service

Django REST API for the House Construction Management System.

---

## 🚀 Quick Run (Local, no Docker)

```bash
cd backend
source venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings_local
python manage.py runserver
```

First time? Run full setup from the project root:

```bash
make local-setup   # create venv + install deps
make reset-local   # fresh migrations + superuser + seed data
make local         # start backend + frontend together
```

---

## 🛠️ Key Technologies

| Layer | Technology |
|---|---|
| Framework | Django 5.x |
| API | Django REST Framework |
| Auth | SimpleJWT (access + refresh tokens) |
| Database (local) | SQLite (`config.settings_local`) |
| Database (prod) | PostgreSQL (`config.settings`) |
| Media storage | Local filesystem / S3-compatible |
| Image handling | Pillow |
| Filtering | django-filter |
| Environment | python-decouple (`.env`) |

---

## 📂 App Structure

```
backend/apps/
├── accounts/        User accounts, JWT auth, roles, worker portal login
├── core/            HouseProject, Phases, Floors, Rooms, ProjectMember
├── attendance/      QR-based check-in/out, DailyAttendance, ScanTimeWindow
├── workforce/       WorkforceMember, Teams, Payroll, Skills, Evaluations
├── tasks/           Task, TaskUpdate, TaskMedia
├── finance/         Budget, Expense, Payment (legacy)
├── fin/             Finance module (clean reimplementation)
├── accounting/      Ledger, Journal entries
├── resource/        Materials, Contractors, Suppliers (clean)
├── resources/       Materials, Contractors, Suppliers (legacy variant)
├── estimate/        Advanced estimation
├── estimator/       Estimation module variant
├── permits/         Permit applications and approvals
├── photo_intel/     Photo AI analysis
├── analytics/       Reporting and analytics
├── assistant/       AI assistant (Sathi) integration
└── data_transfer/   CSV / Excel import-export
```

---

## 🔑 Permission System

Two-layer access control:

| Layer | Model | Scope |
|---|---|---|
| Global role | `accounts.Role` | System-wide flags (`can_manage_finances`, etc.) |
| Project role | `core.ProjectMember` | Per-project flags per user |

**ProjectMember roles:** OWNER › MANAGER › ENGINEER › SUPERVISOR › CONTRACTOR › VIEWER

**Key permission flags on ProjectMember:**

| Flag | Who gets it by default |
|---|---|
| `can_manage_members` | OWNER, MANAGER |
| `can_manage_finances` | OWNER, MANAGER |
| `can_manage_phases` | OWNER, MANAGER, ENGINEER, SUPERVISOR |
| `can_manage_resources` | OWNER, MANAGER, CONTRACTOR |
| `can_manage_workforce` | OWNER, MANAGER, SUPERVISOR |
| `can_approve_purchases` | OWNER, MANAGER |
| `can_upload_media` | all except VIEWER |

---

## 👷 Worker Portal

Field workers log in at `/worker` (frontend) or via:

```
POST /api/v1/worker/login/    { phone, pin }  → JWT tokens
GET  /api/v1/worker/me/       own profile + today attendance
POST /api/v1/worker/checkin/  { type: CHECK_IN | CHECK_OUT }
GET  /api/v1/worker/my-team/  team leader roster view
```

Worker accounts are created from the Workforce Hub → Members tab → 📱 Portal button.

---

## 🌱 Seed Commands

| Command | What it does |
|---|---|
| `python manage.py seed_all` | Full seed — all modules in dependency order |
| `python manage.py workforce_seeds` | Seed all workforce sub-models only |
| `python manage.py workforce_seeds --clear` | Wipe workforce data then re-seed |
| `python manage.py workforce_seeds --project <id>` | Target a specific project |
| `python manage.py workforce_seeds --members-only` | Members only, skip payroll/evaluations |
| `python manage.py seed_workforce` | Seed categories, roles and skills only |

**Via Makefile (from project root):**

```bash
make seed                    # seed_all via local venv
make seed-workforce          # workforce_seeds via local venv
make seed-workforce-clear    # --clear variant
make seed-workforce-docker   # run inside Docker container
```

---

## 🗂️ Management Commands Reference

| Command | App | Description |
|---|---|---|
| `seed_all` | core | Full ordered seed of all modules |
| `seed_jitu_project` | core | Seed a single demo project with phases/rooms |
| `seed_workforce` | workforce | Seed categories, roles, skills |
| `workforce_seeds` | workforce | Seed ALL workforce models (full) |
| `migrate_attendance_to_workforce` | workforce | Migrate legacy AttendanceWorker → WorkforceMember |
| `seed_humans` | core | Seed attendance workers + teams |

---

## 🔗 API Base URLs

| Prefix | Module |
|---|---|
| `/api/v1/auth/` | Login, logout, register, token refresh |
| `/api/v1/accounts/` | Users, roles, activity logs |
| `/api/v1/worker/` | Worker portal endpoints |
| `/api/v1/projects/` | HouseProject CRUD |
| `/api/v1/attendance/` | Attendance tracking |
| `/api/v1/workforce/` | Workforce management |
| `/api/v1/finance/` | Finance (legacy) |
| `/api/v1/fin/` | Finance (clean) |
| `/api/v1/resource/` | Resources (clean) |
| `/api/v1/estimate/` | Estimation |
| `/api/v1/permits/` | Permits |
| `/api/v1/analytics/` | Analytics |
| `/api/v1/dashboard/combined/` | Dashboard aggregation |
| `/api/v1/health/` | Health check |

---

> For full local setup, see [`docs/reset-local.md`](../docs/reset-local.md)  
> For deployment, see [`docs/DEPLOY.md`](../docs/DEPLOY.md)
