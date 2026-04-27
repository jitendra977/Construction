#!/usr/bin/env bash
# ============================================================
#  ConstructPro — First-Time VPS Setup
#
#  Run this ONCE on a fresh server to install everything needed.
#  Tested on Ubuntu 22.04 LTS.
#
#  Usage (run on the VPS directly or via ssh):
#    curl -sSL https://raw.githubusercontent.com/.../setup.sh | bash
#    -- OR --
#    ssh user@host 'bash -s' < ./scripts/setup.sh
# ============================================================
set -euo pipefail

GRN='\033[0;32m'; CYN='\033[0;36m'; YEL='\033[1;33m'; BOLD='\033[1m'; RST='\033[0m'
OK="${GRN}✔${RST}"; NFO="${CYN}▶${RST}"

step() { echo -e "\n${BOLD}${CYN}── $* ──${RST}"; }
ok()   { echo -e "${OK}  $*"; }
log()  { echo -e "${NFO} $*"; }

PROJECT_DIR="${PROJECT_DIR:-/home/nishanaweb/project/Construction}"
DEPLOY_USER="${DEPLOY_USER:-nishanaweb}"

# ── 1. System packages ────────────────────────────────────────
step "System packages"
apt-get update -qq
apt-get install -y -qq \
    curl wget git unzip \
    ca-certificates gnupg lsb-release \
    ufw fail2ban \
    htop iotop ncdu \
    jq
ok "System packages installed"

# ── 2. Docker ─────────────────────────────────────────────────
step "Docker Engine"
if ! command -v docker &>/dev/null; then
    curl -fsSL https://get.docker.com | sh
    usermod -aG docker "$DEPLOY_USER"
    ok "Docker installed"
else
    ok "Docker already installed: $(docker --version)"
fi

# Docker Compose plugin (v2)
if ! docker compose version &>/dev/null; then
    COMPOSE_VERSION="2.27.0"
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/download/v${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    ok "Docker Compose v${COMPOSE_VERSION} installed"
else
    ok "Docker Compose already installed: $(docker compose version)"
fi

# ── 3. Firewall ───────────────────────────────────────────────
step "UFW Firewall"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ok "Firewall configured (SSH + 80 + 443)"

# ── 4. Fail2ban ───────────────────────────────────────────────
step "Fail2ban (brute-force protection)"
systemctl enable fail2ban --now
ok "Fail2ban active"

# ── 5. Docker network ─────────────────────────────────────────
step "Shared Docker network"
docker network inspect app-network &>/dev/null \
    || docker network create app-network
ok "app-network ready"

# ── 6. Project directory ──────────────────────────────────────
step "Project directory"
mkdir -p "$(dirname "$PROJECT_DIR")"
if [[ ! -d "$PROJECT_DIR" ]]; then
    log "Clone repo here? Set up manually or clone now."
    log "Example: git clone git@github.com:yourorg/Construction.git $PROJECT_DIR"
else
    ok "Project directory already exists: $PROJECT_DIR"
fi

# ── 7. Swap (2 GB) ────────────────────────────────────────────
step "Swap space"
if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ok "2GB swap created"
else
    ok "Swap already configured"
fi

# ── 8. Sysctl tweaks ─────────────────────────────────────────
step "Kernel tweaks"
cat >> /etc/sysctl.conf <<'EOF'
# ConstructPro tuning
vm.swappiness=10
net.core.somaxconn=1024
net.ipv4.tcp_fastopen=3
EOF
sysctl -p --quiet
ok "Kernel params applied"

# ── 9. Logrotate for deploy log ───────────────────────────────
step "Log rotation"
cat > /etc/logrotate.d/constructpro <<EOF
${PROJECT_DIR}/deploy.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
}
EOF
ok "Logrotate configured"

# ── Done ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GRN}╔══════════════════════════════════════════╗${RST}"
echo -e "${BOLD}${GRN}║   VPS setup complete!                    ║${RST}"
echo -e "${BOLD}${GRN}╚══════════════════════════════════════════╝${RST}"
echo ""
echo -e "  Next steps:"
echo -e "  1. cd ${PROJECT_DIR}"
echo -e "  2. cp .env.example .env  && nano .env"
echo -e "  3. make deploy"
echo ""
