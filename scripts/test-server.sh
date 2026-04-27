#!/usr/bin/env bash
# ============================================================
#  ConstructPro — Cloud Server Health Test
#  Run from your LOCAL terminal: bash scripts/test-server.sh
# ============================================================
set -euo pipefail

HOST="${1:-nishanaweb.cloud}"
GREEN='\033[0;32m'; RED='\033[0;31m'; CYN='\033[0;36m'; YEL='\033[1;33m'; BOLD='\033[1m'; RST='\033[0m'

ok()   { echo -e "${GREEN}  ✔  $*${RST}"; }
fail() { echo -e "${RED}  ✖  $*${RST}"; }
info() { echo -e "${CYN}  ▶  $*${RST}"; }
warn() { echo -e "${YEL}  ⚠  $*${RST}"; }

echo ""
echo -e "${BOLD}  ConstructPro — Cloud Server Diagnostics${RST}"
echo -e "  Target: ${BOLD}$HOST${RST}"
echo "  ──────────────────────────────────────────────"

PASS=0; FAIL=0

# ── 1. DNS ────────────────────────────────────────────────────
info "1. DNS resolution"
IP=$(dig +short "$HOST" 2>/dev/null | head -1)
if [[ -n "$IP" ]]; then
  ok "DNS resolves → $IP"
  ((PASS++))
else
  fail "DNS not resolving for $HOST"
  ((FAIL++))
fi

# ── 2. Port 80 ────────────────────────────────────────────────
info "2. Port 80 (HTTP)"
if nc -zw3 "$HOST" 80 2>/dev/null; then
  ok "Port 80 open"
  ((PASS++))
else
  fail "Port 80 closed or unreachable"
  ((FAIL++))
fi

# ── 3. Port 443 ───────────────────────────────────────────────
info "3. Port 443 (HTTPS)"
if nc -zw3 "$HOST" 443 2>/dev/null; then
  ok "Port 443 open"
  ((PASS++))
else
  warn "Port 443 closed — SSL not configured yet"
  ((FAIL++))
fi

# ── 4. Health endpoint ────────────────────────────────────────
info "4. Django health endpoint"
RESP=$(curl -sf --max-time 8 "https://$HOST/api/v1/health/" 2>/dev/null) && PROTO="https" || \
RESP=$(curl -sf --max-time 8 "http://$HOST/api/v1/health/"  2>/dev/null) && PROTO="http"  || PROTO=""

if [[ -n "$PROTO" ]]; then
  ok "Health OK ($PROTO) → $RESP"
  ((PASS++))
  [[ "$PROTO" == "http" ]] && warn "SSL not active yet — run: make ssl HOST=$HOST"
else
  fail "Health endpoint not responding — server may be down or not deployed yet"
  ((FAIL++))
  echo ""
  echo -e "  ${YEL}Possible reasons:${RST}"
  echo "    • Docker containers not started  → ssh $HOST 'cd project/Construction && make up'"
  echo "    • App not deployed yet           → make deploy"
  echo "    • Nginx not running              → ssh $HOST 'docker compose ps'"
  echo "    • Firewall blocking port 80/443  → ufw allow 80 && ufw allow 443"
fi

# ── 5. Frontend ───────────────────────────────────────────────
info "5. Frontend (Nginx / React)"
CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 8 "https://$HOST/" 2>/dev/null || \
       curl -so /dev/null -w "%{http_code}" --max-time 8 "http://$HOST/"  2>/dev/null || echo "000")
if [[ "$CODE" =~ ^(200|301|302)$ ]]; then
  ok "Frontend → HTTP $CODE"
  ((PASS++))
else
  fail "Frontend → HTTP $CODE (not reachable)"
  ((FAIL++))
fi

# ── 6. Django admin ───────────────────────────────────────────
info "6. Django admin panel"
CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 8 "https://$HOST/admin/" 2>/dev/null || \
       curl -so /dev/null -w "%{http_code}" --max-time 8 "http://$HOST/admin/"  2>/dev/null || echo "000")
if [[ "$CODE" =~ ^(200|301|302)$ ]]; then
  ok "Admin panel → HTTP $CODE  (https://$HOST/admin/)"
  ((PASS++))
else
  fail "Admin panel → HTTP $CODE"
  ((FAIL++))
fi

# ── 7. API auth endpoint ──────────────────────────────────────
info "7. API auth (login endpoint)"
CODE=$(curl -so /dev/null -w "%{http_code}" -X POST --max-time 8 \
       -H "Content-Type: application/json" \
       -d '{"username":"x","password":"x"}' \
       "https://$HOST/api/v1/auth/login/" 2>/dev/null || \
       curl -so /dev/null -w "%{http_code}" -X POST --max-time 8 \
       -H "Content-Type: application/json" \
       -d '{"username":"x","password":"x"}' \
       "http://$HOST/api/v1/auth/login/" 2>/dev/null || echo "000")
# 400/401 means the API is alive (bad credentials expected)
if [[ "$CODE" =~ ^(200|400|401)$ ]]; then
  ok "Auth API alive → HTTP $CODE (expected 400/401 for wrong creds)"
  ((PASS++))
else
  fail "Auth API → HTTP $CODE (not reachable)"
  ((FAIL++))
fi

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "  ──────────────────────────────────────────────"
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  All $TOTAL checks passed — server is healthy ✔${RST}"
else
  echo -e "${YEL}${BOLD}  $PASS/$TOTAL passed — $FAIL issue(s) found${RST}"
fi
echo ""
