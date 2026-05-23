#!/usr/bin/env bash
# ============================================================
#  ConstructPro Backend — Container Entrypoint
#
#  Responsibilities (in order):
#    1. Wait for PostgreSQL to be reachable
#    2. Seed roles + admin user   (web process only)
#    3. Fix media-volume ownership
#    4. exec the real process (gunicorn / celery / beat)
#
#  !! Migrations are NOT run here !!
#  They are run once, before containers start, by the deploy
#  script using a dedicated --rm container so there is never
#  a race between web / celery / beat all migrating at once.
# ============================================================
set -euo pipefail

GRN='\033[0;32m'; CYN='\033[0;36m'; YEL='\033[1;33m'; RST='\033[0m'
log()  { echo -e "${CYN}[entrypoint]${RST} $*"; }
ok()   { echo -e "${GRN}[entrypoint] ✔${RST} $*"; }
warn() { echo -e "${YEL}[entrypoint] ⚠${RST} $*"; }

# ── 1. Wait for database ──────────────────────────────────────
wait_for_db() {
    log "Waiting for database..."
    python - <<'PYEOF'
import os, socket, time, sys

host = os.environ.get("DB_HOST", "")
port = int(os.environ.get("DB_PORT", 5432))

if not host:
    time.sleep(2)
    sys.exit(0)

for attempt in range(1, 31):
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        print(f"  DB reachable at {host}:{port} (attempt {attempt})")
        sys.exit(0)
    except OSError:
        print(f"  Waiting for {host}:{port} ... ({attempt}/30)")
        time.sleep(2)

print("ERROR: Database not reachable after 60s")
sys.exit(1)
PYEOF
}

wait_for_db
ok "Database is reachable"

# ── 2. Seed admin user + roles (web process only) ─────────────
# Skip for celery workers / beat — they don't need it and it
# wastes startup time. Detect by checking the first argument.
FIRST_CMD="${1:-}"
if [[ "$FIRST_CMD" == "gunicorn" || "$FIRST_CMD" == "python" || -z "$FIRST_CMD" ]]; then
    log "Seeding admin user and roles..."
    if ! python manage.py shell <<'PYEOF'
from apps.accounts.models import User, Role
import os

for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={"name": name})

super_admin_role, _ = Role.objects.get_or_create(
    code=Role.SUPER_ADMIN,
    defaults={"name": "Super Admin", "can_manage_all_systems": True},
)

admin_email    = os.environ.get("DJANGO_SUPERUSER_EMAIL",    "admin@gmail.com")
admin_username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
admin_pass     = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "")

user = (
    User.objects.filter(email=admin_email).first()
    or User.objects.filter(username=admin_username).first()
)

if user:
    user.username     = admin_username
    user.email        = admin_email
    user.role         = super_admin_role
    user.is_superuser = True
    user.is_staff     = True
    if admin_pass:
        user.set_password(admin_pass)
        print(f"  Password updated from DJANGO_SUPERUSER_PASSWORD")
    else:
        print(f"  Password unchanged (DJANGO_SUPERUSER_PASSWORD not set)")
    user.save()
    print(f"  Updated admin user: {admin_email}")
else:
    if not admin_pass:
        print("SKIP: DJANGO_SUPERUSER_PASSWORD not set. Admin user not created during startup.")
    else:
        User.objects.create_superuser(
            username=admin_username,
            email=admin_email,
            password=admin_pass,
            role=super_admin_role,
        )
        print(f"  Created admin user: {admin_email}")
PYEOF
    then
        ok "Admin user ready"
    else
        warn "Admin/role seeding skipped. App startup will continue."
    fi
fi

# ── 3. Media directory permissions ────────────────────────────
mkdir -p /app/media
chown -R appuser:appgroup /app/media 2>/dev/null || true
ok "Media directory writable"

# ── 4. Start app ──────────────────────────────────────────────
ok "Starting: $*"
exec "$@"
