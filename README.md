# HCMS — House Construction Management System

A full-stack platform for managing the complete residential construction lifecycle — projects, phases, tasks, finance, materials, estimates, permits, and more.

**Live:** [construction.nishanaweb.cloud](https://construction.nishanaweb.cloud) · **API:** [api.construction.nishanaweb.cloud/api/v1](https://api.construction.nishanaweb.cloud/api/v1)

---

## ⚡ Quick Start (Local — No Docker)

```bash
# First time only — creates venv, installs all deps, seeds admin
make local-setup

# Every day after
make local
```

Runs on **SQLite** locally — no PostgreSQL or Redis required.

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:8000/api/v1 |
| Admin    | http://localhost:8000/admin |
| Login    | admin@gmail.com / adminpass |

> Override admin credentials: `LOCAL_ADMIN_EMAIL=you@x.com LOCAL_ADMIN_PASS=secret make local`

---

## 🛠 All Make Commands

```bash
make help          # show all commands
```

### Local Development (no Docker)
| Command | Description |
|---------|-------------|
| `make local` | Start backend + frontend with hot reload |
| `make local-setup` | First-time: create venv + install all deps |
| `make local-backend` | Backend only |
| `make local-frontend` | Frontend only |

### Docker Dev Stack
| Command | Description |
|---------|-------------|
| `make dev` | Start Docker dev stack |
| `make dev-build` | Rebuild then start |
| `make dev-down` | Stop dev stack |

### Production
| Command | Description |
|---------|-------------|
| `make deploy` | Full deploy: push → build → migrate → restart |
| `make update` | Quick update: pull + rebuild + migrate on VPS |
| `make up` | Start all containers |
| `make down` | Stop containers |
| `make logs` | Tail all logs |
| `make logs-backend` | Backend logs only |
| `make migrate` | Run migrations in container |
| `make shell` | Django shell in container |
| `make db-backup` | Dump database to `backups/` |

---

## 🏗 Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Framework | Django 4.2 + Django REST Framework |
| Auth | Simple JWT (access + refresh tokens) |
| Database | PostgreSQL 16 (prod) / SQLite (local) |
| Cache | Redis 7 |
| Task queue | Celery + django-celery-beat |
| Python | 3.9+ |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| HTTP | Axios |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Charts | Recharts |

### Infrastructure
| Layer | Technology |
|-------|-----------|
| Containers | Docker + Docker Compose |
| Web server | Nginx (frontend) + Gunicorn (backend) |
| Proxy | Nginx Proxy Manager |
| VPS | nishanaweb.cloud |

---

## 📦 Backend Apps

| App | Path | Description |
|-----|------|-------------|
| `accounts` | `/api/v1/accounts/` | Users, roles, JWT auth, activity logs |
| `core` | `/api/v1/projects/` | Projects, phases, floors, rooms, gallery |
| `tasks` | `/api/v1/tasks/` | Tasks, updates, media attachments |
| `finance` | `/api/v1/finance/` | Budget categories, funding, expenses |
| `accounting` | `/api/v1/accounting/` | Journal entries, accounts, purchase orders |
| `fin` | `/api/v1/fin/` | Clean finance module (bills, payments, transfers) |
| `resources` | `/api/v1/` | Contractors, materials, suppliers, documents |
| `resource` | `/api/v1/resource/` | Advanced resource management |
| `estimator` | `/api/v1/estimator/` | Legacy calculators + BoQ generator |
| `estimate` | `/api/v1/estimate/` | Advanced estimator: saved estimates, 9 calculators, rate history |
| `permits` | `/api/v1/permits/` | Permit steps and document attachments |
| `photo_intel` | `/api/v1/photo-intel/` | Photo analysis and intelligence |
| `analytics` | `/api/v1/analytics/` | Project analytics and trends |
| `assistant` | `/api/v1/assistant/` | AI assistant |
| `data_transfer` | `/api/v1/data-transfer/` | Export project as SQL / import SQL |

---

## ✨ Features

### Project Management
- Multi-project support with project switching
- Construction phases, floors, rooms
- Project member roles and permissions
- Dashboard with live stats

### Tasks & Progress
- Task creation with phases, assignees, priorities
- Task updates with photo/media attachments
- Timelapse gallery per project

### Finance
- Budget categories per phase
- Funding sources and transactions
- Expense and payment tracking
- Journal entries (double-entry accounting)
- Bills, purchase orders, bank transfers

### Resource Management
- Contractors and suppliers with ratings
- Material inventory and transactions
- Wastage alerts and thresholds
- Document storage

### Advanced Estimator
- **9 calculators:** Wall, Concrete, Plaster, PCC Flooring, Tile Flooring, Paint, Roofing, Staircase, Excavation
- **Saved estimates** with section-by-section breakdown (materials + labor)
- **EstimateBuilder** — auto-generates full project estimate from area/floor/room inputs
- **Material rates** with change history and bulk update
- **Labor rates** per trade (mason, helper, carpenter, electrician, plumber, painter…)
- **BoQ generator** — parametric Bill of Quantities from templates
- Quality tiers: Economy / Standard / Premium / Luxury

### Permits
- Permit step tracking with status
- Document attachments per step

### Data Transfer
- Export any project as a complete `.sql` file
- Import SQL files with atomic execution and rollback on error
- Row count preview before export

### User Guides & Help
- Structured user guides with steps, sections, FAQs

---

## 🗂 Project Structure

```
Construction/
├── Makefile                    # All commands live here
├── README.md
├── docker-compose.dev.yml      # Local Docker stack
├── docker-compose.prod.yml     # Production stack (6 services)
├── backend/
│   ├── apps/
│   │   ├── accounts/           # Auth, users, roles
│   │   ├── core/               # Projects, phases, gallery
│   │   ├── tasks/              # Tasks, updates, media
│   │   ├── finance/            # Budgets, expenses
│   │   ├── accounting/         # Double-entry accounting
│   │   ├── fin/                # Clean finance module
│   │   ├── resources/          # Materials, contractors
│   │   ├── resource/           # Advanced resources
│   │   ├── estimator/          # Legacy estimator + BoQ
│   │   ├── estimate/           # Advanced estimator (new)
│   │   ├── permits/            # Permit tracking
│   │   ├── photo_intel/        # Photo analysis
│   │   ├── analytics/          # Analytics
│   │   ├── assistant/          # AI assistant
│   │   └── data_transfer/      # SQL export/import
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── modules/            # Self-contained feature modules
│   │   │   ├── finance/
│   │   │   ├── resource/
│   │   │   ├── structure/
│   │   │   ├── projects/
│   │   │   ├── timeline/
│   │   │   └── accounts/
│   │   ├── pages/              # Top-level pages
│   │   ├── components/         # Shared components
│   │   ├── services/           # API service layer
│   │   └── context/            # React context
│   └── Dockerfile
├── scripts/
│   ├── deploy.sh               # Full production deploy
│   ├── update.sh               # Quick VPS update
│   ├── run_local.sh            # Local dev runner
│   ├── setup.sh                # VPS first-time setup
│   └── dev.sh                  # Docker dev stack helper
└── docs/                       # Setup and deployment guides
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=backend.nishanaweb.cloud,localhost
CORS_ALLOWED_ORIGINS=https://construction.nishanaweb.cloud

DB_ENGINE=django.db.backends.postgresql
DB_NAME=constructpro
DB_USER=constructpro
DB_PASSWORD=your-db-password
DB_HOST=db
DB_PORT=5432

REDIS_URL=redis://:your-redis-password@redis:6379/0
REDIS_PASSWORD=your-redis-password

JWT_ACCESS_TOKEN_LIFETIME=60
JWT_REFRESH_TOKEN_LIFETIME=1440

EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### Frontend (`frontend/.env`)
```env
VITE_API_URL=https://api.construction.nishanaweb.cloud/api/v1
```

> **Local dev** uses `config/settings_local.py` — no `.env` editing needed, SQLite is automatic.

---

## 🚀 Production Deploy

```bash
# One command — pulls code, rebuilds images, runs migrations, restarts
make deploy
```

Production runs 6 Docker containers:
- `construction_db` — PostgreSQL 16
- `construction_redis` — Redis 7
- `construction_backend` — Django + Gunicorn
- `construction_frontend` — React + Nginx
- `construction_celery` — Celery worker
- `construction_celery_beat` — Celery scheduler

Routed via **Nginx Proxy Manager** on the shared `app-network`:
- `construction.nishanaweb.cloud` → frontend container
- `backend.nishanaweb.cloud` → backend container

---

## 👤 Default Admin

| Field | Value |
|-------|-------|
| Email | admin@gmail.com |
| Password | adminpass |
| Role | Super Admin |

Auto-seeded on every container startup via `entrypoint.sh`.

---

## 👨‍💻 Developer

**Jitendra Khadka** — [jitendrakhadka4@gmail.com](mailto:jitendrakhadka4@gmail.com)

© 2026 — Private & Proprietary
