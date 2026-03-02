#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🔍 Checking NGINX PROXY MANAGER (NPM) Status..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    cd "$REMOTE_PROJECT_DIR"
    
    echo "📦 Container Status:"
    docker ps --filter "name=nginx-proxy-manager" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo "📜 Latest NPM Logs (last 20 lines):"
    docker compose logs --tail=20 nginx-proxy-manager
    
    echo "🌐 Testing internal connectivity to port 81..."
    curl -I http://localhost:81 || echo "❌ NPM Admin is NOT responding locally on the server!"
    
    echo "🛡️  Checking server firewall (UFW) status..."
    sudo ufw status || echo "⚠️  Could not check UFW status (needs sudo)."
EOF

echo ""
echo "🎉 Status check complete!"
echo "🔥 If NPM is 'Up' but you still get 'Empty Response' in the browser,"
echo "it is DEFINITELY a firewall or Cloud Security Group block."
