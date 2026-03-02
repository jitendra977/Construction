#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "☢️ Starting NUCLEAR DATABASE FIX..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    cd "$REMOTE_PROJECT_DIR"
    
    echo "🗑️  Dropping conflicting 'accounts_activitylog' table..."
    # We use a one-off container to run a SQL command to drop the table
    docker compose run --rm backend python manage.py dbshell -c "DROP TABLE IF EXISTS accounts_activitylog;"
    
    echo "⚙️  Running migrations with --fake-initial..."
    docker compose run --rm backend python manage.py migrate --fake-initial
    
    echo "⚙️  Running final migration check..."
    docker compose run --rm backend python manage.py migrate
    
    echo "🚀 Restarting Backend..."
    docker compose up -d backend
    
    echo "✅ Final Container Status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo ""
echo "🎉 Nuclear fix complete! If the backend is 'Up', the database is healthy."
echo "🔥 NEXT STEP (MANDATORY): Run the firewall commands manually on your server!"
