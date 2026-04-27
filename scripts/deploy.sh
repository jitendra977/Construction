#!/usr/bin/env bash
# ============================================================
#  ConstructPro — Smart Deploy Script
#
#  Usage:
#    ./scripts/deploy.sh                      # full production deploy
#    ./scripts/deploy.sh --env dev            # deploy dev stack
#    ./scripts/deploy.sh --rollback           # roll back to previous tag
#    ./scripts/deploy.sh --service backend    # rebuild one service only
#    ./scripts/deploy.sh --dry-run            # preview without changes
# ============================================================
set -euo pipefail

# ── Colours ──────────────────────────────────────────────────
RED='\033[0;31m'; YEL='\033[1;33m'; GRN='\033[0;32m'
CYN='\033[0;36m'; BOLD='\033[1m'; RST='\033[0m'
OK="${GRN}✔${RST}"; WRN="${YEL}⚠${RST}"; ERR="${RED}✖${RST}"; NFO="${CYN}▶${RST}"

# ── Defaults ─────────────────────────────────────────────────
ENV="prod"; ROLLBACK=false; DRY_RUN=false; SERVICE=""
COMPOSE_FILE="docker-compose.prod.yml"
LOG_FILE="./deploy.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# ── Argument parsing ─────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --env)      ENV="$2";      shift 2 ;;
    --rollback) ROLLBACK=true; shift   ;;
    --dry-run)  DRY_RUN=true;  shift   ;;
    --service)  SERVICE="$2";  shift 2 ;;
    -h|--help)
      grep '^#  ' "$0" | sed 's/#  //'
      exit 0 ;;
    *) echo -e "${ERR} Unknown: $1"; exit 1 ;;
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
    # NOTE: pipe through tee so ALL server-side output (including Docker build
    # errors) is captured in deploy.log.  pipefail propagates ssh exit code.
    ssh -o StrictHostKeyChecking=no \
        "${VPS_USER}@${VPS_HOST}" "bash -s" <<REMOTE 2>&1 | tee -a "$LOG_FILE"
$1
REMOTE
  fi
}

# ── SSH agent — load key once so all connections share it ─────
if [[ "$DRY_RUN" == "false" ]]; then
  if ! ssh-add -l &>/dev/null; then
    eval "$(ssh-agent -s)" >/dev/null
  fi
  ssh-add ~/.ssh/id_ed25519 2>/dev/null || true
fi

# ── Banner ────────────────────────────────────────────────────
echo "" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}╔══════════════════════════════════════════╗${RST}" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}║       ConstructPro Deploy System         ║${RST}" | tee -a "$LOG_FILE"
echo -e "${BOLD}${CYN}╚══════════════════════════════════════════╝${RST}" | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Time:${RST}   ${TIMESTAMP}"      | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Env:${RST}    ${ENV}"             | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Branch:${RST} ${BRANCH}"          | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Tag:${RST}    ${IMAGE_TAG}"       | tee -a "$LOG_FILE"
echo -e "  ${BOLD}Host:${RST}   ${VPS_HOST}"        | tee -a "$LOG_FILE"
[[ "$DRY_RUN"  == "true" ]] && echo -e "  ${YEL}DRY RUN — no changes will be made${RST}" | tee -a "$LOG_FILE"
[[ "$ROLLBACK" == "true" ]] && echo -e "  ${YEL}ROLLBACK MODE${RST}" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# ════════════════════════════════════════════════════════════
#  ROLLBACK
# ════════════════════════════════════════════════════════════
if [[ "$ROLLBACK" == "true" ]]; then
  step "Rolling back"
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
#  NORMAL DEPLOY
# ════════════════════════════════════════════════════════════

# 1. Pre-flight
step "Pre-flight checks"
command -v git >/dev/null || die "git not found"
command -v ssh >/dev/null || die "ssh not found"
ok "Local tools OK"

DIRTY=$(git status --porcelain 2>/dev/null | grep -v '??' || true)
if [[ -n "$DIRTY" ]]; then
  warn "Uncommitted changes:"
  echo "$DIRTY"
  read -r -p "  Continue anyway? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || die "Aborted."
fi
ok "Git status OK"

if [[ "$DRY_RUN" == "false" ]]; then
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=6 \
      "${VPS_USER}@${VPS_HOST}" "echo reachable" >/dev/null 2>&1 \
    || die "Cannot reach ${VPS_HOST} via SSH"
  ok "SSH reachable"
fi

# 2. Push code
step "Push code → origin/${BRANCH}"
run "git push origin HEAD:${BRANCH}"
ok "Code pushed"

# 3. Build service list
BUILD_SERVICES="$SERVICE"   # empty = all
UP_SERVICES="$SERVICE"

# 4. Remote deploy
step "Remote deploy on ${VPS_HOST}"
ssh_exec "
  set -e
  cd '${REMOTE_DIR}'

  echo '==> Git safe dir'
  git config --global --add safe.directory '${REMOTE_DIR}' 2>/dev/null || true

  echo '==> Pull latest code (hard reset — server working tree is always authoritative from git)'
  git fetch origin
  git checkout '${BRANCH}'
  git reset --hard origin/'${BRANCH}'
  git clean -fd

  echo '==> Save current tag for rollback'
  PREV=\$(grep '^IMAGE_TAG=' .env 2>/dev/null | cut -d= -f2 | head -1 || echo 'latest')
  # Update or insert IMAGE_TAG_PREV
  if grep -q '^IMAGE_TAG_PREV=' .env 2>/dev/null; then
    sed -i \"s|^IMAGE_TAG_PREV=.*|IMAGE_TAG_PREV=\$PREV|\" .env
  else
    echo \"IMAGE_TAG_PREV=\$PREV\" >> .env
  fi
  # Update or insert IMAGE_TAG
  if grep -q '^IMAGE_TAG=' .env 2>/dev/null; then
    sed -i 's|^IMAGE_TAG=.*|IMAGE_TAG=${IMAGE_TAG}|' .env
  else
    echo 'IMAGE_TAG=${IMAGE_TAG}' >> .env
  fi

  echo '==> Build images (tag: ${IMAGE_TAG})'
  export IMAGE_TAG='${IMAGE_TAG}'
  docker compose -f '${COMPOSE_FILE}' build --pull ${BUILD_SERVICES}

  echo '==> Run migrations'
  docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend \
    python manage.py migrate --noinput

  echo '==> Collect static files'
  docker compose -f '${COMPOSE_FILE}' run --rm --no-deps backend \
    python manage.py collectstatic --noinput --clear

  echo '==> Start / restart services'
  docker compose -f '${COMPOSE_FILE}' up -d ${UP_SERVICES}

  echo '==> Wait for containers (20s)'
  sleep 20

  echo '==> Service status'
  docker compose -f '${COMPOSE_FILE}' ps

  echo '==> Prune unused images'
  docker image prune -f

  echo '==> DONE'
"

# 5. Smoke test
step "Smoke test"
if [[ "$DRY_RUN" == "false" ]]; then
  HEALTH="https://api.construction.nishanaweb.cloud/api/v1/health/"
  CODE=$(curl -sk -o /dev/null -w "%{http_code}" --max-time 12 "$HEALTH" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    ok "Health check → HTTP ${CODE}"
  else
    warn "Health check → HTTP ${CODE}  (site may still be starting)"
    warn "Check with: make logs   |   make status"
  fi
fi

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GRN}╔══════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${GRN}║   Deploy complete!  Tag: ${IMAGE_TAG}${RST}"
echo -e "${BOLD}${GRN}╚══════════════════════════════════════════╝${RST}"
echo -e "  Full log: ${LOG_FILE}"
echo ""
