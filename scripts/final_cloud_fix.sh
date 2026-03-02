#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🔧 Starting FINAL CLOUD FIX (Migrations & NPM Accessibility)..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    
    # 1. Fix Database Migrations
    echo "⚙️ Fixing Database Migration State..."
    cd "$REMOTE_PROJECT_DIR"
    docker compose run --rm backend python manage.py migrate --fake-initial

    # 2. Restart Backend to Verify
    echo "🚀 Restarting Backend..."
    docker compose up -d backend

    # 3. Check NPM Connectivity Locally on Server
    echo "🔍 Checking if NPM is responding locally..."
    curl -I http://localhost:81 || echo "❌ NPM Admin is NOT responding even locally!"

    # 4. Final Status Check
    echo "✅ Containers Status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo ""
echo "🔥 IMPORTANT: If you still cannot access http://nishanaweb.cloud:81 in your browser,"
echo "it is likely a FIREWALL issue. Please run these commands MANUALLY on the server:"
echo "   sudo ufw allow 80/tcp"
echo "   sudo ufw allow 443/tcp"
echo "   sudo ufw allow 81/tcp"
echo "   sudo ufw reload"
echo ""
echo "🎉 Final fix script complete!"
