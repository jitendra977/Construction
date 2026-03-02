#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🚀 Starting ULTIMATE DATABASE FIX..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    cd "$REMOTE_PROJECT_DIR"
    
    echo "🐍 Using Python Shell to drop conflicting tables..."
    # This uses Django's own DB connection to ensure we are hitting the right database
    docker compose run --rm backend python manage.py shell -c "from django.db import connection; with connection.cursor() as cursor: cursor.execute('DROP TABLE IF EXISTS accounts_activitylog'); cursor.execute('DROP TABLE IF EXISTS accounts_role');"
    
    echo "⚙️  Running migrations with --fake-initial..."
    docker compose run --rm backend python manage.py migrate --fake-initial
    
    echo "⚙️  Applying remaining migrations..."
    docker compose run --rm backend python manage.py migrate
    
    echo "🚀 Restarting Backend..."
    docker compose up -d backend
    
    echo "✅ Final Container Status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo ""
echo "🎉 Ultimate fix complete! If the backend is 'Up', the database is fixed."
echo "🔥 IMPORTANT: If you still see 'Empty Response' for nishanaweb.cloud,"
echo "it is 100% a FIREWALL issue. You MUST manually open ports 80, 443, 81."
