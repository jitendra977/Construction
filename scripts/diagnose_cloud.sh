#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
NPM_DIR="/home/nishanaweb/nginx-proxy-manager"
APP_DIR="/home/nishanaweb/project/Construction"

echo "🔍 Starting CLOUD DIAGNOSTICS & FIX..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    
    echo "--- 1. Check Container Status ---"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

    echo "--- 2. Check Firewall (UFW) ---"
    if command -v ufw > /dev/null; then
        sudo ufw status
        echo "🔧 Ensuring ports 80, 443, and 81 are ALLOWED..."
        sudo ufw allow 80/tcp || true
        sudo ufw allow 443/tcp || true
        sudo ufw allow 81/tcp || true
        sudo ufw reload || true
    else
        echo "⚠️ UFW not found, skipping firewall check."
    fi

    echo "--- 3. Check NPM Logs (Top 20 lines) ---"
    docker logs nginx-proxy-manager --tail 20

    echo "--- 4. Check Network Connectivity ---"
    echo "🌐 Testing if NPM can 'see' Backend..."
    docker exec nginx-proxy-manager ping -c 2 construction_backend || echo "❌ NPM cannot ping backend!"

    echo "--- 5. Check if port 81 is listening locally ---"
    sudo lsof -i :81 || echo "❌ No process listening on port 81!"

    echo "--- 6. Verify Docker Networks ---"
    docker network ls
    docker network inspect app-network --format '{{range .Containers}}{{.Name}} {{end}}'
EOF

echo "✅ Diagnostics complete! Please review the output above."
