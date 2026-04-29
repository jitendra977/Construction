#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  reset_local_db.sh  —  Nuke migrations + SQLite, rebuild from scratch
#
#  Usage (from project root):
#    bash scripts/reset_local_db.sh
#
#  What it does:
#    1. Deletes all migration files (except __init__.py) in backend/apps/
#    2. Deletes db.sqlite3 and any journal/WAL files
#    3. Runs makemigrations for every app
#    4. Runs migrate (--run-syncdb for apps without migrations)
#    5. Creates a local superuser (admin@gmail.com / adminpass)
# ─────────────────────────────────────────────────────────────────────────────

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
VENV="$BACKEND/venv/bin/activate"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'
RED='\033[0;31m';   BOLD='\033[1m';    RESET='\033[0m'
ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
info() { echo -e "${CYAN}→${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }
err()  { echo -e "${RED}✖${RESET}  $*" >&2; }
hr()   { echo -e "${CYAN}────────────────────────────────────────${RESET}"; }

hr
echo -e "${BOLD}${CYAN}  HCMS — Full Local DB Reset${RESET}"
hr
echo ""

# ── Guard: venv must exist ────────────────────────────────────────────────────
if [ ! -f "$VENV" ]; then
    err "No venv found at $VENV"
    echo "     Run first:  make local-setup"
    exit 1
fi

cd "$BACKEND"
source "$VENV"
export DJANGO_SETTINGS_MODULE=config.settings_local

# ── 1. Delete migration files ─────────────────────────────────────────────────
info "Deleting all migration files (keeping __init__.py)..."
find "$BACKEND/apps" -path "*/migrations/*.py" ! -name "__init__.py" -delete
find "$BACKEND/apps" -path "*/migrations/*.pyc" -delete
ok "Migration files deleted"

# ── 2. Delete SQLite database files ──────────────────────────────────────────
info "Deleting SQLite database..."
rm -f "$BACKEND/db.sqlite3"
rm -f "$BACKEND/db.sqlite3-journal"
rm -f "$BACKEND/db.sqlite3-wal"
rm -f "$BACKEND/db.sqlite3-shm"
ok "SQLite files deleted"

# ── 3. makemigrations for every app ──────────────────────────────────────────
info "Running makemigrations..."

APPS=(
    accounts
    core
    attendance
    resource
    resources
    finance
    fin
    accounting
    tasks
    teams
    estimate
    estimator
    permits
    photo_intel
    analytics
    assistant
    workforce
)

for app in "${APPS[@]}"; do
    # Only run if the app directory exists
    if [ -d "$BACKEND/apps/$app" ]; then
        python manage.py makemigrations "$app" --noinput -v 0 2>/dev/null \
            && echo -e "   ${GREEN}✓${RESET} $app" \
            || echo -e "   ${YELLOW}~${RESET} $app (no changes)"
    fi
done

ok "makemigrations complete"
echo ""

# ── 4. migrate ───────────────────────────────────────────────────────────────
info "Running migrate..."
python manage.py migrate --run-syncdb --noinput
ok "Migrations applied"
echo ""

# ── 5. Create superuser ───────────────────────────────────────────────────────
ADMIN_EMAIL="${LOCAL_ADMIN_EMAIL:-admin@gmail.com}"
ADMIN_PASS="${LOCAL_ADMIN_PASS:-adminpass}"

info "Creating superuser ($ADMIN_EMAIL)..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='$ADMIN_EMAIL').exists():
    kwargs = dict(email='$ADMIN_EMAIL', password='$ADMIN_PASS')
    # Supply any REQUIRED_FIELDS the custom model declares
    if 'username' in [f.name for f in User._meta.get_fields()]:
        kwargs['username'] = 'admin'
    if 'first_name' in [f.name for f in User._meta.get_fields()]:
        kwargs['first_name'] = 'Admin'
    if 'last_name' in [f.name for f in User._meta.get_fields()]:
        kwargs['last_name'] = 'Local'
    User.objects.create_superuser(**kwargs)
    print('  created')
else:
    print('  already exists — skipped')
"
ok "Superuser ready"

# ── 6. Full seed ──────────────────────────────────────────────────────────────
info "Running full seed (project, attendance, resources, teams, workforce)..."
python manage.py seed_all
ok "Seed complete"

echo ""
hr
echo -e "${GREEN}${BOLD}  ✅  Reset complete!${RESET}"
hr
echo ""
echo -e "  Now run:  ${CYAN}make local${RESET}   (or  make local-backend)"
echo -e "  Admin:    ${CYAN}http://localhost:8000/admin${RESET}  →  $ADMIN_EMAIL / $ADMIN_PASS"
echo ""
