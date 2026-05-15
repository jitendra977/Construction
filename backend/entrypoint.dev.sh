#!/usr/bin/env bash
# ============================================================
#  ConstructPro Backend — Dev Container Entrypoint
#  Dev only: wait for DB (proper socket check), migrate, seed.
# ============================================================
set -e

GRN='\033[0;32m'; CYN='\033[0;36m'; RST='\033[0m'
log() { echo -e "${CYN}[dev]${RST} $*"; }
ok()  { echo -e "${GRN}[dev] ✔${RST} $*"; }

# ── Wait for DB (socket check — not sleep) ────────────────────
log "Waiting for database..."
python - <<'PYEOF'
import os, socket, time, sys
host = os.environ.get("DB_HOST", "")
port = int(os.environ.get("DB_PORT", 5432))
if not host:
    time.sleep(1); sys.exit(0)
for attempt in range(1, 31):
    try:
        s = socket.create_connection((host, port), timeout=2)
        s.close()
        print(f"  DB reachable at {host}:{port}")
        sys.exit(0)
    except OSError:
        print(f"  Waiting for {host}:{port} ... ({attempt}/30)")
        time.sleep(2)
print("ERROR: DB not reachable after 60s"); sys.exit(1)
PYEOF
ok "Database is reachable"

# ── Migrations ────────────────────────────────────────────────
log "Running migrations..."
python manage.py migrate --noinput
ok "Migrations done"

# ── Seed admin + roles ────────────────────────────────────────
log "Seeding admin user and roles..."
python manage.py shell <<'PYEOF'
from apps.accounts.models import User, Role

for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={"name": name})

super_admin_role, _ = Role.objects.get_or_create(
    code=Role.SUPER_ADMIN,
    defaults={"name": "Super Admin", "can_manage_all_systems": True},
)

admin_email, admin_user, admin_pass = "admin@gmail.com", "admin", "adminpass"

user = (
    User.objects.filter(email=admin_email).first()
    or User.objects.filter(username=admin_user).first()
)
if user:
    user.username = admin_user; user.email = admin_email
    user.role = super_admin_role; user.is_superuser = True; user.is_staff = True
    user.set_password(admin_pass); user.save()
    print(f"  Updated: {admin_email}")
else:
    User.objects.create_superuser(
        username=admin_user, email=admin_email,
        password=admin_pass, role=super_admin_role,
    )
    print(f"  Created: {admin_email} / {admin_pass}")
PYEOF
ok "Admin ready (admin@gmail.com / adminpass)"

# ── Start ─────────────────────────────────────────────────────
ok "Starting: $*"
exec "$@"
