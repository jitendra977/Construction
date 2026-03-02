#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🧹 Starting FRESH START DATABASE WIPE..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    cd "$REMOTE_PROJECT_DIR"
    
    echo "⚠️  Wiping existing database volume..."
    docker compose down
    docker volume rm -f construction_mysql_data || true
    
    echo "🚀 Restarting with a clean slate..."
    docker compose up -d
    
    echo "⚙️  Waiting for DB and running fresh migrations..."
    # We use a loop to wait for the health check or just wait a bit
    sleep 15
    docker compose run --rm backend python manage.py migrate
    
    echo "✅ Fresh Containers Status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo ""
echo "🎉 Fresh start complete! The database is now clean and fully migrated."
echo "🔥 IMPORTANT: site is still invisible due to 'Empty Response'."
echo "Please manually run these on your SSH terminal NOW:"
echo "   sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 81/tcp && sudo ufw reload"
