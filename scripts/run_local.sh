#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  run_local.sh  —  One-command local dev runner (no Docker, no PostgreSQL)
#
#  Usage:
#    ./scripts/run_local.sh            # start backend + frontend
#    ./scripts/run_local.sh --setup    # first-time: create venv + install deps
#    ./scripts/run_local.sh --backend  # backend only
#    ./scripts/run_local.sh --frontend # frontend only
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173

# Admin credentials — override via env vars, never hardcode real passwords
ADMIN_EMAIL="${LOCAL_ADMIN_EMAIL:-admin@gmail.com}"
ADMIN_PASS="${LOCAL_ADMIN_PASS:-adminpass}"   # dev-only default; set LOCAL_ADMIN_PASS to override

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
RED='\033[0;31m';   BOLD='\033[1m';    RESET='\033[0m'
ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
info() { echo -e "${CYAN}→${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✖${RESET}  $*"; }
hr()   { echo -e "${CYAN}────────────────────────────────────────${RESET}"; }

# ── Cleanup on Ctrl-C ────────────────────────────────────────────────────────
cleanup() {
    echo ""
    warn "Stopping services..."
    [[ -n "$BACKEND_PID"  ]] && kill "$BACKEND_PID"  2>/dev/null || true
    [[ -n "$FRONTEND_PID" ]] && kill "$FRONTEND_PID" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# ── Parse flags ──────────────────────────────────────────────────────────────
RUN_BACKEND=true
RUN_FRONTEND=true
DO_SETUP=false

for arg in "$@"; do
    case $arg in
        --setup)   DO_SETUP=true ;;
        --backend) RUN_FRONTEND=false ;;
        --frontend)RUN_BACKEND=false ;;
        --help|-h)
            echo "Usage: ./scripts/run_local.sh [--setup] [--backend] [--frontend]"
            exit 0
            ;;
    esac
done

hr
echo -e "${BOLD}${CYAN}  HCMS — Local Development${RESET}"
hr

# ═══════════════════════════════════════════════════════════════════════════
#  BACKEND SETUP
# ═══════════════════════════════════════════════════════════════════════════
if $RUN_BACKEND; then
    cd "$BACKEND_DIR"

    # 1. Create venv if missing
    if [ ! -d "venv" ]; then
        info "Creating Python virtual environment..."
        python3 -m venv venv
        DO_SETUP=true   # force install on fresh venv
        ok "venv created"
    fi

    # 2. Activate venv
    source venv/bin/activate

    # 3. Install / sync requirements
    #    Prefer requirements-local.txt (no mysqlclient/psycopg2/redis) when
    #    available — avoids needing native C libs that break on a fresh Mac.
    if $DO_SETUP || ! python -c "import django" 2>/dev/null; then
        info "Installing Python dependencies (this takes ~30s first time)..."
        pip install -q --upgrade pip
        if [ -f "requirements-local.txt" ]; then
            pip install -q -r requirements-local.txt
        else
            pip install -q -r requirements.txt
        fi
        ok "Dependencies installed"
    else
        ok "Dependencies up to date"
    fi

    # 4. Use local settings (SQLite, no Redis, no PostgreSQL)
    #    This bypasses the production .env entirely.
    export DJANGO_SETTINGS_MODULE=config.settings_local

    # 5. Run migrations
    info "Running database migrations..."
    python manage.py migrate --run-syncdb --noinput -v 0
    ok "Migrations applied"

    # 6. Seed admin user
    info "Seeding admin user ($ADMIN_EMAIL)..."
    python manage.py shell -c "
from apps.accounts.models import User, Role
for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={'name': name})
email = '$ADMIN_EMAIL'
u, created = User.objects.get_or_create(email=email, defaults={'username': 'admin'})
u.set_password('$ADMIN_PASS')
u.is_superuser = True
u.is_staff = True
role = Role.objects.filter(code=Role.SUPER_ADMIN).first()
if role: u.role = role
u.save()
print('created' if created else 'updated')
" 2>/dev/null && ok "Admin ready  (email: $ADMIN_EMAIL  |  password: $ADMIN_PASS)"

    # 7. Start backend
    info "Starting Django on http://localhost:$BACKEND_PORT ..."
    python manage.py runserver "0.0.0.0:$BACKEND_PORT" &
    BACKEND_PID=$!
    cd "$ROOT"
fi

# ═══════════════════════════════════════════════════════════════════════════
#  FRONTEND SETUP
# ═══════════════════════════════════════════════════════════════════════════
if $RUN_FRONTEND; then
    cd "$FRONTEND_DIR"

    # Install npm deps if node_modules missing or --setup
    if $DO_SETUP || [ ! -d "node_modules" ]; then
        info "Installing frontend dependencies..."
        if command -v bun &>/dev/null; then
            bun install --silent
        else
            npm install --silent
        fi
        ok "Frontend dependencies installed"
    fi

    export VITE_API_URL="http://localhost:$BACKEND_PORT/api/v1"

    info "Starting Vite on http://localhost:$FRONTEND_PORT ..."
    if command -v bun &>/dev/null; then
        bun run dev -- --port "$FRONTEND_PORT" --host &
    else
        npm run dev -- --port "$FRONTEND_PORT" --host &
    fi
    FRONTEND_PID=$!
    cd "$ROOT"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
sleep 1
hr
echo -e "${BOLD}${GREEN}  App is running!${RESET}"
echo ""
if $RUN_FRONTEND; then
echo -e "  🌐 Frontend  → ${CYAN}http://localhost:$FRONTEND_PORT${RESET}"
fi
if $RUN_BACKEND; then
echo -e "  📡 Backend   → ${CYAN}http://localhost:$BACKEND_PORT/api/v1${RESET}"
echo -e "  🔑 Admin     → ${CYAN}http://localhost:$BACKEND_PORT/admin${RESET}"
echo -e "  👤 Login     → $ADMIN_EMAIL / $ADMIN_PASS"
fi
echo ""
echo -e "  Press ${BOLD}Ctrl+C${RESET} to stop"
hr

# ── Wait ─────────────────────────────────────────────────────────────────────
wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
