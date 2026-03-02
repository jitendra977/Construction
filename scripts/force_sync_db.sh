#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🔄 Starting FORCE DATABASE SYNC..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    cd "$REMOTE_PROJECT_DIR"
    
    echo "⚙️  Faking 'accounts' migrations (skipping existing tables)..."
    docker compose run --rm backend python manage.py migrate --fake accounts
    
    echo "⚙️  Applying remaining migrations..."
    docker compose run --rm backend python manage.py migrate
    
    echo "🚀 Restarting Backend..."
    docker compose up -d backend
    
    echo "✅ Final Container Status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo ""
echo "🎉 Force sync complete! If the backend is 'Up', the database is fixed."
echo "🔥 REMINDER: If port 81 (NPM) still doesn't open, run these manually on the server:"
echo "   sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 81/tcp && sudo ufw reload"
