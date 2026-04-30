#!/usr/bin/env bash
# ============================================================
#  ConstructPro — Quick Update Script
#
#  Faster than a full deploy — pulls latest code on the VPS,
#  runs only what changed. No local git push needed.
#
#  Usage:
#    ./scripts/update.sh                    # full update
#    ./scripts/update.sh --migrations-only  # migrations + restart backend
#    ./scripts/update.sh --service frontend # rebuild one service
#    ./scripts/update.sh --no-rebuild       # pull code, restart only
# ============================================================
set -euo pipefail

RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'; CYN='\033[0;36m'
BOLD='\033[1m'; RST='\033[0m'
OK="${GRN}✔${RST}"; WRN="${YEL}⚠${RST}"; NFO="${CYN}▶${RST}"; ERR="${RED}✖${RST}"

# ── Defaults ─────────────────────────────────────────────────
MIGRATIONS_ONLY=false
NO_REBUILD=false
SERVICE=""
COMPOSE_FILE="docker-compose.prod.yml"

while [[ $# -gt 0 ]]; do
  case $1 in
    --migrations-only) MIGRATIONS_ONLY=true; shift ;;
    --no-rebuild)      NO_REBUILD=true;       shift ;;
    --service)         SERVICE="$2";          shift 2 ;;
    --env)
      [[ "$2" == "dev" ]] && COMPOSE_FILE="docker-compose.dev.yml"
      shift 2 ;;
    *) echo -e "${ERR} Unknown: $1"; exit 1 ;;
  esac
done

[[ -f ".env" ]] && export $(grep -v '^#' .env | grep -v '^$' | xargs)

VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"
BRANCH="${DEPLOY_BRANCH:-deploy-server}"

log()  { echo -e "${NFO} $*"; }
ok()   { echo -e "${OK}  $*"; }
warn() { echo -e "${WRN} $*"; }
die()  { echo -e "${ERR} $*"; exit 1; }

echo -e "\n${BOLD}${CYN}── ConstructPro Quick Update ──${RST}"
echo -e "  Host: ${VPS_HOST}  |  Branch: ${BRANCH}\n"

ssh -o StrictHostKeyChecking=no -o ConnectTimeout=6 \
    "${VPS_USER}@${VPS_HOST}" "bash -s" <<REMOTE
set -e
cd '${REMOTE_DIR}'

echo '==> Pull latest code'
git config --global --add safe.directory '${REMOTE_DIR}' 2>/dev/null || true
git fetch origin
git stash 2>/dev/null || true
git pull origin '${BRANCH}'
git stash pop 2>/dev/null || true

# Helper to run migrations with fallback for squashed/refactored histories
run_migrations() {
  echo '==> Running migrations'
  if ! docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend python manage.py migrate --noinput; then
    echo '!! Standard migration failed. Attempting to reconcile history with --fake-initial ...'
    if ! docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend python manage.py migrate --noinput --fake-initial; then
      echo '!! Still failing. Final attempt with global --fake to synchronize history ...'
      docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend python manage.py migrate --noinput --fake
    fi
  fi
}

$(if [[ "$MIGRATIONS_ONLY" == "true" ]]; then cat <<'EOF'
echo '==> Migrations only'
run_migrations
docker compose -f '${COMPOSE_FILE}' restart backend celery celery-beat
EOF
elif [[ "$NO_REBUILD" == "true" ]]; then cat <<'EOF'
echo '==> Restart without rebuild'
run_migrations
docker compose -f '${COMPOSE_FILE}' up -d --force-recreate ${SERVICE}
EOF
else cat <<'EOF'
echo '==> Rebuild and restart'
export IMAGE_TAG="$(grep '^IMAGE_TAG=' .env | cut -d= -f2 | head -1 || echo latest)"
docker compose -f '${COMPOSE_FILE}' build --pull ${SERVICE}
run_migrations
docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend python manage.py collectstatic --noinput --clear
docker compose -f '${COMPOSE_FILE}' up -d ${SERVICE}
EOF
fi)

echo '==> Service status'
docker compose -f '${COMPOSE_FILE}' ps

echo '==> DONE'
REMOTE

ok "Update complete"
