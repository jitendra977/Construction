# ============================================================
#  ConstructPro — Command Center
#
#  Run `make help` to see all commands.
#  All docker compose commands default to production.
#  Add ENV=dev to switch:  make up ENV=dev
# ============================================================

.DEFAULT_GOAL := help
SHELL         := /bin/bash
ENV           ?= prod
SERVICE       ?=

COMPOSE_PROD  := docker-compose.prod.yml
COMPOSE_DEV   := docker-compose.dev.yml
COMPOSE_FILE  := $(if $(filter dev,$(ENV)),$(COMPOSE_DEV),$(COMPOSE_PROD))
DC            := docker compose -f $(COMPOSE_FILE)

# Load .env if present
-include .env
export

# ── Colours ──────────────────────────────────────────────────
CYAN  := \033[0;36m
GREEN := \033[0;32m
RESET := \033[0m
BOLD  := \033[1m

# ════════════════════════════════════════════════════════════
#  HELP
# ════════════════════════════════════════════════════════════
.PHONY: help
help: ## Show this help message
	@echo ""
	@echo -e "$(BOLD)$(CYAN)  ConstructPro — Make Commands$(RESET)"
	@echo -e "  Usage: make <command> [ENV=dev] [SERVICE=backend]"
	@echo ""
	@echo -e "$(BOLD)  🚀 Deploy$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}; /Deploy|deploy/{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)  🐳 Docker$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}; /Docker|docker|Container/{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)  🛠  Dev$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}; /Dev|dev|Local/{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)  🗄  Database$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}; /DB|db|Migrat|migrat|Seed|seed/{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo -e "$(BOLD)  🔧 Maintenance$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}; /Maintenance|Clean|Backup|Shell|Logs/{printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# ════════════════════════════════════════════════════════════
#  🚀 DEPLOY
# ════════════════════════════════════════════════════════════

# Local only — push code to git, server is NOT touched
.PHONY: deploy
deploy: ## Deploy — push code to git only (server unchanged)
	@bash scripts/deploy.sh

# Server side — SSH in, pull, build, migrate, restart
.PHONY: server-deploy
server-deploy: ## Deploy — build + migrate + restart on VPS (SSH)
	@bash scripts/deploy.sh --server

.PHONY: server-deploy-service
server-deploy-service: ## Deploy — rebuild one service on VPS: make server-deploy-service SERVICE=backend
	@bash scripts/deploy.sh --server --service $(SERVICE)

# Push code then immediately deploy on server
.PHONY: full-deploy
full-deploy: ## Deploy — push code then deploy on server (combined)
	@bash scripts/deploy.sh
	@bash scripts/deploy.sh --server

.PHONY: rollback
rollback: ## Deploy — roll back server to previous image tag
	@bash scripts/deploy.sh --rollback

.PHONY: dry-run
dry-run: ## Deploy — preview push without making changes
	@bash scripts/deploy.sh --dry-run

.PHONY: migrate-remote
migrate-remote: ## Deploy — run migrations on VPS only
	@bash scripts/update.sh --migrations-only

.PHONY: server-shell
server-shell: ## Maintenance — open production Django shell on VPS
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && docker compose -f docker-compose.prod.yml exec backend python manage.py shell"

.PHONY: server-logs
server-logs: ## Maintenance — tail production backend logs on VPS
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && docker compose -f docker-compose.prod.yml logs -f backend"

.PHONY: server-db-heal
server-db-heal: ## DB — Force-add missing columns to production DB
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && docker compose -f docker-compose.prod.yml exec backend python manage.py shell -c \"from django.db import connection; cursor = connection.cursor(); cursor.execute('ALTER TABLE core_constructionphase ADD COLUMN IF NOT EXISTS technical_spec text DEFAULT \\'\\';'); print('✅ Column technical_spec added!')\""

.PHONY: server-db-reset
server-db-reset: ## DB — WIPE and REBUILD production database (DESTRUCTIVE)
	@echo "⚠️  WARNING: This will DELETE all data on the PRODUCTION server. Ctrl+C to cancel."
	@sleep 5
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && \
	  docker compose -f docker-compose.prod.yml stop backend celery celery-beat && \
	  docker compose -f docker-compose.prod.yml exec db psql -U $${DB_USER:-constructpro} -d postgres -c 'DROP DATABASE IF EXISTS $${DB_NAME:-constructpro};' && \
	  docker compose -f docker-compose.prod.yml exec db psql -U $${DB_USER:-constructpro} -d postgres -c 'CREATE DATABASE $${DB_NAME:-constructpro};' && \
	  docker compose -f docker-compose.prod.yml run --rm backend python manage.py migrate --noinput && \
	  docker compose -f docker-compose.prod.yml start backend celery celery-beat"

.PHONY: server-admin-fix
server-admin-fix: ## Maintenance — Create or update production Superuser (interactive)
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && \
	  docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"

.PHONY: server-admin-password
server-admin-password: ## Maintenance — Change password for a production user
	@ssh -t $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "cd /home/\$${VPS_USER:-nishanaweb}/project/Construction && \
	  docker compose -f docker-compose.prod.yml exec backend python manage.py changepassword admin@gmail.com"

# ════════════════════════════════════════════════════════════
#  🐳 DOCKER — LOCAL
# ════════════════════════════════════════════════════════════
.PHONY: up
up: ## Docker — start all containers (ENV=dev for dev stack)
	$(DC) up -d $(SERVICE)

.PHONY: down
down: ## Docker — stop and remove containers
	$(DC) down

.PHONY: stop
stop: ## Docker — stop containers (keep volumes)
	$(DC) stop $(SERVICE)

.PHONY: restart
restart: ## Docker — restart containers
	$(DC) restart $(SERVICE)

.PHONY: build
build: ## Docker — build images (add SERVICE= to target one)
	$(DC) build --pull $(SERVICE)

.PHONY: rebuild
rebuild: ## Docker — force rebuild with no cache
	$(DC) build --no-cache --pull $(SERVICE)

.PHONY: ps
ps: ## Docker — show running containers
	$(DC) ps

.PHONY: status
status: ps ## Docker — alias for ps

.PHONY: logs
logs: ## Docker — tail all logs (add SERVICE= to filter)
	$(DC) logs -f --tail=100 $(SERVICE)

.PHONY: logs-backend
logs-backend: ## Docker — tail backend logs only
	$(DC) logs -f --tail=200 backend

.PHONY: logs-frontend
logs-frontend: ## Docker — tail frontend/nginx logs
	$(DC) logs -f --tail=100 frontend

# ════════════════════════════════════════════════════════════
#  🛠 DEV — LOCAL DEVELOPMENT
# ════════════════════════════════════════════════════════════

# ── No-Docker local runner (SQLite, hot reload) ─────────────
.PHONY: local
local: ## Dev — Local run backend + frontend (no Docker, SQLite)
	@chmod +x scripts/run_local.sh && bash scripts/run_local.sh

.PHONY: reset-local
reset-local: ## Dev — Wipe migrations + SQLite and rebuild from scratch
	@chmod +x scripts/reset_local_db.sh && bash scripts/reset_local_db.sh

.PHONY: seed
seed: ## Dev — Re-seed data only (no migration reset): make seed
	@bash -c '\
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py seed_all \
	'

.PHONY: seed-workforce
seed-workforce: ## Dev — Seed all workforce models (members, payroll, teams, etc.): make seed-workforce
	@bash -c '\
	  if [ ! -f "$(VENV_PYTHON)" ]; then \
	    echo "❌  No venv found. Run: make local-setup first."; exit 1; \
	  fi; \
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py workforce_seeds \
	'

.PHONY: seed-workforce-clear
seed-workforce-clear: ## Dev — Wipe & re-seed all workforce data: make seed-workforce-clear
	@bash -c '\
	  if [ ! -f "$(VENV_PYTHON)" ]; then \
	    echo "❌  No venv found. Run: make local-setup first."; exit 1; \
	  fi; \
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py workforce_seeds --clear \
	'

.PHONY: seed-workforce-docker
seed-workforce-docker: ## DB — Seed all workforce models inside Docker container
	$(DC) exec backend python manage.py workforce_seeds

.PHONY: local-setup
local-setup: ## Dev — First-time setup: create venv + install all deps
	@chmod +x scripts/run_local.sh && bash scripts/run_local.sh --setup

.PHONY: local-backend
local-backend: ## Dev — Local backend only
	@chmod +x scripts/run_local.sh && bash scripts/run_local.sh --backend

.PHONY: local-frontend
local-frontend: ## Dev — Local frontend only
	@chmod +x scripts/run_local.sh && bash scripts/run_local.sh --frontend

# ── Local venv — migration helpers (no Docker required) ──────
VENV        := backend/venv
VENV_PYTHON := $(VENV)/bin/python

.PHONY: makemigrations-local mm
makemigrations-local: ## Dev — makemigrations via local venv (optional: APP=attendance)
mm: makemigrations-local
	@bash -c '\
	  if [ ! -f "$(VENV_PYTHON)" ]; then \
	    echo "❌  No venv found. Run: make local-setup first."; exit 1; \
	  fi; \
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py makemigrations $(APP) && \
	  echo "✅  Migration files created." \
	'

.PHONY: migrate-local ml
migrate-local: ## Dev — migrate via local venv (optional: APP=attendance)
ml: migrate-local
	@bash -c '\
	  if [ ! -f "$(VENV_PYTHON)" ]; then \
	    echo "❌  No venv found. Run: make local-setup first."; exit 1; \
	  fi; \
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py migrate $(APP) --noinput && \
	  echo "✅  Migrations applied." \
	'

.PHONY: m-local
m-local: makemigrations-local migrate-local ## Dev — Full local sync: makemigrations + migrate

.PHONY: showmigrations-local
showmigrations-local: ## Dev — show migration status via local venv
	@bash -c '\
	  if [ ! -f "$(VENV_PYTHON)" ]; then \
	    echo "❌  No venv found. Run: make local-setup first."; exit 1; \
	  fi; \
	  cd backend && \
	  export DJANGO_SETTINGS_MODULE=config.settings_local && \
	  source venv/bin/activate && \
	  python manage.py showmigrations \
	'

# ── Docker-based dev stack ───────────────────────────────────
.PHONY: dev
dev: ## Dev — start Docker dev stack (hot reload)
	docker compose -f $(COMPOSE_DEV) up

.PHONY: dev-build
dev-build: ## Dev — rebuild dev Docker images then start
	docker compose -f $(COMPOSE_DEV) up --build

.PHONY: dev-down
dev-down: ## Dev — stop Docker dev stack
	docker compose -f $(COMPOSE_DEV) down

.PHONY: dev-logs
dev-logs: ## Dev — tail Docker dev stack logs
	docker compose -f $(COMPOSE_DEV) logs -f --tail=100

# ════════════════════════════════════════════════════════════
#  🗄 DATABASE — Backup / Restore / Export / Import
# ════════════════════════════════════════════════════════════
.PHONY: migrate
migrate: ## DB — run Django migrations
	$(DC) exec backend python manage.py migrate --noinput

.PHONY: makemigrations
makemigrations: ## DB — create new migrations
	$(DC) exec backend python manage.py makemigrations

.PHONY: showmigrations
showmigrations: ## DB — list migration status
	$(DC) exec backend python manage.py showmigrations

.PHONY: createsuperuser
createsuperuser: ## DB — create Django superuser interactively
	$(DC) exec backend python manage.py createsuperuser

.PHONY: dbshell
dbshell: ## DB — open PostgreSQL shell inside Docker
	$(DC) exec db psql -U $${DB_USER:-constructpro} -d $${DB_NAME:-constructpro}

# ── Backup (Local Docker) ────────────────────────────────────
.PHONY: db-backup
db-backup: ## DB — Backup local Docker DB → backups/db_TIMESTAMP.sql.gz
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S) && \
	$(DC) exec -T db pg_dump \
	  -U $${DB_USER:-constructpro} \
	  --clean --if-exists \
	  $${DB_NAME:-constructpro} \
	  | gzip > backups/db_$$TS.sql.gz && \
	echo "" && \
	echo "✅  Backup saved → backups/db_$$TS.sql.gz" && \
	ls -lh backups/db_$$TS.sql.gz

# ── Restore (Local Docker) ───────────────────────────────────
.PHONY: db-restore
db-restore: ## DB — Restore local Docker DB from file: make db-restore FILE=backups/db_XXX.sql.gz
	@test -n "$(FILE)" || (echo "❌  Usage: make db-restore FILE=backups/db_XXX.sql.gz" && exit 1)
	@test -f "$(FILE)" || (echo "❌  File not found: $(FILE)" && exit 1)
	@echo "⚠️  This will OVERWRITE the current database. Ctrl+C to cancel."
	@sleep 3
	@gunzip -c $(FILE) | $(DC) exec -T db psql \
	  -U $${DB_USER:-constructpro} \
	  -d $${DB_NAME:-constructpro} \
	  --quiet
	@echo "✅  Restore complete from $(FILE)"

# ── Export to plain SQL (readable) ──────────────────────────
.PHONY: db-export
db-export: ## DB — Export local DB as plain SQL: make db-export  → backups/export_TIMESTAMP.sql
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S) && \
	$(DC) exec -T db pg_dump \
	  -U $${DB_USER:-constructpro} \
	  --clean --if-exists \
	  $${DB_NAME:-constructpro} \
	  > backups/export_$$TS.sql && \
	echo "✅  Export saved → backups/export_$$TS.sql" && \
	ls -lh backups/export_$$TS.sql

# ── Import from plain SQL ────────────────────────────────────
.PHONY: db-import
db-import: ## DB — Import plain SQL into local Docker DB: make db-import FILE=backups/export_XXX.sql
	@test -n "$(FILE)" || (echo "❌  Usage: make db-import FILE=backups/export_XXX.sql" && exit 1)
	@test -f "$(FILE)" || (echo "❌  File not found: $(FILE)" && exit 1)
	@echo "⚠️  This will OVERWRITE the current database. Ctrl+C to cancel."
	@sleep 3
	@cat $(FILE) | $(DC) exec -T db psql \
	  -U $${DB_USER:-constructpro} \
	  -d $${DB_NAME:-constructpro} \
	  --quiet
	@echo "✅  Import complete from $(FILE)"

# ── Remote Backup (VPS → Local) ─────────────────────────────
.PHONY: db-pull
db-pull: ## DB — Download DB backup FROM server to ./backups/ (SSH required)
	@mkdir -p backups
	@TS=$$(date +%Y%m%d_%H%M%S) && \
	REMOTE_FILE="/tmp/db_pull_$$TS.sql.gz" && \
	echo "📡  Dumping database on server..." && \
	ssh $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} \
	  "cd $${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction} && \
	  docker compose -f docker-compose.prod.yml exec -T db pg_dump \
	    -U \$${DB_USER:-constructpro} \
	    --clean --if-exists \
	    \$${DB_NAME:-constructpro} | gzip > $$REMOTE_FILE" && \
	echo "⬇️   Downloading to backups/db_server_$$TS.sql.gz ..." && \
	scp $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud}:$$REMOTE_FILE backups/db_server_$$TS.sql.gz && \
	ssh $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} "rm -f $$REMOTE_FILE" && \
	echo "" && \
	echo "✅  Server DB downloaded → backups/db_server_$$TS.sql.gz" && \
	ls -lh backups/db_server_$$TS.sql.gz

# ── Push Local Backup to Server & Restore ───────────────────
.PHONY: db-push
db-push: ## DB — Upload local backup to server and restore it: make db-push FILE=backups/db_XXX.sql.gz
	@test -n "$(FILE)" || (echo "❌  Usage: make db-push FILE=backups/db_XXX.sql.gz" && exit 1)
	@test -f "$(FILE)" || (echo "❌  File not found: $(FILE)" && exit 1)
	@echo "⚠️  This will OVERWRITE the PRODUCTION database. Ctrl+C to cancel."
	@sleep 5
	@REMOTE_TMP="/tmp/$$(basename $(FILE))" && \
	echo "⬆️   Uploading $(FILE) to server..." && \
	scp $(FILE) $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud}:$$REMOTE_TMP && \
	echo "📥  Restoring on server..." && \
	ssh $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} \
	  "cd $${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction} && \
	  gunzip -c $$REMOTE_TMP | docker compose -f docker-compose.prod.yml exec -T db psql \
	    -U \$${DB_USER:-constructpro} \
	    -d \$${DB_NAME:-constructpro} \
	    --quiet && \
	  rm -f $$REMOTE_TMP" && \
	echo "" && \
	echo "✅  Production DB restored from $(FILE)"

# ── List backups ─────────────────────────────────────────────
.PHONY: db-list
db-list: ## DB — List all local backup files
	@echo ""
	@echo -e "$(BOLD)$(CYAN)  Local Backups (./backups/)$(RESET)"
	@ls -lht backups/*.sql* 2>/dev/null | awk '{print "  " $$0}' || echo "  No backups found."
	@echo ""

# ── Prune old backups ────────────────────────────────────────
.PHONY: db-prune
db-prune: ## DB — Delete backups older than 7 days
	@echo "Removing backup files older than 7 days..."
	@find backups/ -name "*.sql*" -mtime +7 -delete -print 2>/dev/null || true
	@echo "✅  Done"

# ════════════════════════════════════════════════════════════
#  🔧 MAINTENANCE
# ════════════════════════════════════════════════════════════
.PHONY: shell
shell: ## Maintenance — open Django shell
	$(DC) exec backend python manage.py shell

.PHONY: bash
bash: ## Maintenance — open bash in backend container
	$(DC) exec backend bash

.PHONY: collectstatic
collectstatic: ## Maintenance — collect static files
	$(DC) exec backend python manage.py collectstatic --noinput --clear

.PHONY: health
health: ## Maintenance — check /api/v1/health/ endpoint
	@URL=$${VITE_API_URL:-http://localhost:8000/api/v1}/health/ && \
	echo "Checking $$URL ..." && \
	curl -sf "$$URL" | python3 -m json.tool || echo "FAILED"

.PHONY: clean
clean: ## Maintenance — remove stopped containers and dangling images
	docker container prune -f
	docker image prune -f

.PHONY: clean-all
clean-all: ## Maintenance — full Docker cleanup (DESTRUCTIVE — keeps volumes)
	docker system prune -f

.PHONY: volumes
volumes: ## Maintenance — list Docker volumes
	docker volume ls | grep construction

.PHONY: setup-vps
setup-vps: ## Maintenance — run first-time VPS setup script via SSH
	ssh $${VPS_USER:-nishanaweb}@$${VPS_HOST:-nishanaweb.cloud} 'bash -s' < scripts/setup.sh

.PHONY: env-check
env-check: ## Maintenance — verify required .env vars are set
	@echo "Checking required environment variables..."
	@for var in SECRET_KEY DB_PASSWORD REDIS_PASSWORD VITE_API_URL VPS_HOST; do \
	  val=$$(grep "^$$var=" .env 2>/dev/null | cut -d= -f2); \
	  if [[ -z "$$val" || "$$val" == *"change-me"* ]]; then \
	    echo "  ✖  $$var — missing or default!"; \
	  else \
	    echo "  ✔  $$var"; \
	  fi; \
	done

.PHONY: add-tech
add-tech: ## Maintenance — interactive guide to add a new technology/service
	@echo ""
	@echo "  To add a new service (e.g. Elasticsearch, Minio, Flower):"
	@echo "  1. Add a service block to docker-compose.prod.yml"
	@echo "  2. Add its env vars to .env.example and .env"
	@echo "  3. Connect it to the 'internal' network"
	@echo "  4. Add a healthcheck"
	@echo "  5. Run: make build && make up SERVICE=<new-service>"
	@echo ""
	@echo "  Common add-ons:"
	@echo "  - Elasticsearch:  image: elasticsearch:8.13-alpine"
	@echo "  - MinIO (S3):     image: minio/minio:latest"
	@echo "  - Flower (Celery):image: mher/flower:latest"
	@echo "  - Mailhog (dev):  image: mailhog/mailhog:latest"
	@echo "  - Prometheus:     image: prom/prometheus:latest"
	@echo "  - Grafana:        image: grafana/grafana:latest"
	@echo ""
