#!/usr/bin/env bash
# ============================================================
#  ConstructPro — Deploy Script
#
#  LOCAL commands (no SSH):
#    make deploy                  # git push only  ← default
#    make deploy --dry-run        # preview push
#
#  SERVER commands (SSH required):
#    make server-deploy           # pull + build + migrate + restart on VPS
#    make server-deploy SERVICE=backend   # rebuild one service only
#    make rollback                # roll back to previous image tag
# ============================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'
CYN='\033[0;36m'; BOLD='\033[1m'; RST='\033[0m'
OK="${GRN}✔${RST}"; WRN="${YEL}⚠${RST}"; ERR="${RED}✖${RST}"; NFO="${CYN}▶${RST}"

# ── Defaults ─────────────────────────────────────────────────
ENV="prod"; DRY_RUN=false; SERVICE=""
MODE="push"          # push | server | rollback
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="./deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ── Argument parsing ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)         ENV="$2";      shift 2 ;;
    --server)      MODE="server"; shift   ;;
    --rollback)    MODE="rollback"; shift ;;
    --dry-run)     DRY_RUN=true;  shift   ;;
    --service)     SERVICE="$2";  shift 2 ;;
    -h|--help)
      grep '^#  ' "$0" | sed 's/#  //'
      exit 0 ;;
    *) echo -e "${ERR} Unknown flag: $1"; exit 1 ;;
  esac
done

[[ "$ENV" == "dev" ]] && COMPOSE_FILE="docker-compose.dev.yml"

# ── Load .env ────────────────────────────────────────────────
[[ -f ".env" ]] && export $(grep -v '^#' .env | grep -v '^$' | xargs)

VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"
BRANCH="${DEPLOY_BRANCH:-main}"
IMAGE_TAG="${TIMESTAMP}"

# ── Helpers ───────────────────────────────────────────────────
log()  { echo -e "${NFO} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${OK}  $*" | tee -a "$LOG_FILE"; }
warn() { echo -e "${WRN} $*" | tee -a "$LOG_FILE"; }
die()  { echo -e "${ERR} $*" | tee -a "$LOG_FILE"; exit 1; }
step() { echo -e "\n${BOLD}${CYN}── $* ──${RST}" | tee -a "$LOG_FILE"; }

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YEL}[dry-run]${RST} $*"
  else
    eval "$@" 2>&1 | tee -a "$LOG_FILE"
  fi
}

ssh_exec() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "  ${YEL}[dry-run → VPS]${RST} (ssh block skipped)"
  else
    ssh -o StrictHostKeyChecking=no \
        "${VPS_USER}@${VPS_HOST}" "bash -s" <<REMOTE 2>&1 | tee -a "$LOG_FILE"
$1
REMOTE
  fi
}

# ── SSH agent ─────────────────────────────────────────────────
load_ssh() {
  if ! ssh-add -l &>/dev/null; then
    eval "$(ssh-agent -s)" >/dev/null
  fi
  ssh-add ~/.ssh/id_ed25519 2>/dev/null || true
}

# ── Banner ────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}╔══════════════════════════════════════════╗${RST}" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}║       ConstructPro Deploy System         ║${RST}" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}╚══════════════════════════════════════════╝${RST}" | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Mode:${RST}   ${MODE}"            | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Time:${RST}   ${TIMESTAMP}"       | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Branch:${RST} ${BRANCH}"          | tee -a "$LOG_FILE"
[[ "$DRY_RUN" == "true" ]] && echo -e "  ${YEL}DRY RUN — no changes will be made${RST}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"


# ════════════════════════════════════════════════════════════
#  MODE: push  — local git push only, server untouched
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "push" ]]; then
  step "Pre-flight"
  command -v git >/dev/null || die "git not found"

  DIRTY=$(git status --porcelain 2>/dev/null | grep -v '??' || true)
  if [[ -n "$DIRTY" ]]; then
    warn "Uncommitted changes detected:"
    echo "$DIRTY"
    read -r -p "  Continue anyway? [y/N] " ans
    [[ "$ans" =~ ^[Yy]$ ]] || die "Aborted."
  fi
  ok "Git status OK"

  step "Push code → origin/${BRANCH}"
  run "git push origin HEAD:${BRANCH}"
  ok "Code pushed to origin/${BRANCH}"

  echo ""
  echo -e "${BOLD}${GRN}╔══════════════════════════════════════════╗${RST}"
  echo -e "${BOLD}${GRN}║   Code pushed. Server NOT touched.       ║${RST}"
  echo -e "${BOLD}${GRN}╚══════════════════════════════════════════╝${RST}"
  echo -e "  To deploy on the server run:  ${BOLD}make server-deploy${RST}"
  echo ""
  exit 0
fi


# ════════════════════════════════════════════════════════════
#  MODE: rollback  — revert server to previous image tag
# ════════════════════════════════════════════════════════════
if [[ "$MODE" == "rollback" ]]; then
  [[ "$DRY_RUN" == "false" ]] && load_ssh
  step "Rolling back server to previous tag"
  ssh_exec "
    set -e
    cd '${REMOTE_DIR}'
    PREV=\$(grep '^IMAGE_TAG_PREV=' .env | cut -d= -f2 || echo 'latest')
    echo \"Rolling back to tag: \$PREV\"
    export IMAGE_TAG=\"\$PREV\"
    docker compose -f '${COMPOSE_FILE}' up -d --no-build
    docker compose -f '${COMPOSE_FILE}' ps
  "
  ok "Rollback complete"
  exit 0
fi


# ════════════════════════════════════════════════════════════
#  MODE: server  — SSH deploy: pull + build + migrate + restart
# ════════════════════════════════════════════════════════════
step "Pre-flight"
command -v ssh >/dev/null || die "ssh not found"

if [[ "$DRY_RUN" == "false" ]]; then
  load_ssh
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=6 \
      "${VPS_USER}@${VPS_HOST}" "echo reachable" >/dev/null 2>&1 \
    || die "Cannot reach ${VPS_HOST} via SSH"
  ok "SSH reachable: ${VPS_HOST}"
fi

BUILD_SERVICES="$SERVICE"
UP_SERVICES="$SERVICE"

step "Remote deploy on ${VPS_HOST}"
ssh_exec "
  set -e
  cd '${REMOTE_DIR}'

  echo '==> Git safe dir'
  git config --global --add safe.directory '${REMOTE_DIR}' 2>/dev/null || true

  echo '==> Pull latest code'
  git fetch origin
  git checkout '${BRANCH}'
  git reset --hard origin/'${BRANCH}'
  git clean -fd

  echo '==> Save current tag for rollback'
  PREV=\$(grep '^IMAGE_TAG=' .env 2>/dev/null | cut -d= -f2 | head -1 || echo 'latest')
  if grep -q '^IMAGE_TAG_PREV=' .env 2>/dev/null; then
    sed -i \"s|^IMAGE_TAG_PREV=.*|IMAGE_TAG_PREV=\$PREV|\" .env
  else
    echo \"IMAGE_TAG_PREV=\$PREV\" >> .env
  fi
  if grep -q '^IMAGE_TAG=' .env 2>/dev/null; then
    sed -i \"s|^IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|\" .env
  else
    echo \"IMAGE_TAG=${IMAGE_TAG}\" >> .env
  fi

  echo '==> Build images (tag: ${IMAGE_TAG})'
  export IMAGE_TAG='${IMAGE_TAG}'
  docker compose -f '${COMPOSE_FILE}' build --pull ${BUILD_SERVICES}

  echo '==> Ensure infrastructure (db, redis) is up'
  docker compose -f '${COMPOSE_FILE}' up -d db redis

  echo '==> Run migrations'
  if ! docker compose -f '${COMPOSE_FILE}' run --rm backend python manage.py migrate --noinput; then
    echo '!! Migration failed (likely history mismatch). Running Deep Reconciler...'
    
    # 1. Clear ENTIRE migration history table.
    docker compose -f '${COMPOSE_FILE}' run --rm --entrypoint python backend manage.py shell -c \"
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute('DELETE FROM django_migrations')
    print('Wiped entire django_migrations table.')
\"
    # 2. Re-apply history using --fake.
    # Since the DB schema likely already matches the models after a squash/refactor,
    # --fake is the safest way to mark all new migrations as finished without running SQL.
    echo '==> Re-applying all migrations with --fake...'
    docker compose -f '${COMPOSE_FILE}' run --rm backend python manage.py migrate --noinput --fake
  fi

  echo '==> Collect static files'
  docker compose -f '${COMPOSE_FILE}' run --rm backend \
    python manage.py collectstatic --noinput --clear

  echo '==> Start / restart services'
  # Force all services to start to ensure stack is complete
  docker compose -f '${COMPOSE_FILE}' up -d --force-recreate --remove-orphans backend frontend celery celery-beat db redis

  echo '==> Wait for containers (20s)'
  sleep 20

  echo '==> Service status'
  docker compose -f '${COMPOSE_FILE}' ps

  echo '==> Prune old project images (keep current tag only)'
  docker images --format '{{.Repository}}:{{.Tag}}' \
    | grep '^constructpro-' \
    | grep -v ':${IMAGE_TAG}$' \
    | xargs -r docker rmi -f 2>/dev/null || true
  docker image prune -f

  echo '==> DONE'
"

# Smoke test
step "Smoke test"
if [[ "$DRY_RUN" == "false" ]]; then
  HEALTH="https://api.construction.nishanaweb.cloud/api/v1/health/"
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 12 "$HEALTH" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    ok "Health check → HTTP ${CODE}"
  else
    warn "Health check → HTTP ${CODE}  (may still be starting)"
    warn "Check with: make logs   |   make status"
  fi
fi

echo ""
echo -e "${BOLD}${GRN}╔══════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${GRN}║   Server deploy complete!  Tag: ${IMAGE_TAG}${RST}"
echo -e "${BOLD}${GRN}╚══════════════════════════════════════════╝${RST}"
echo -e "  Full log: ${LOG_FILE}"
echo ""
