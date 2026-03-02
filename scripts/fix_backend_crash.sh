#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"

echo "🔧 Starting BACKEND & NPM FIX..."

ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    
    echo "--- 1. Inspecting Backend Crash Logs ---"
    cd "$REMOTE_PROJECT_DIR"
    docker compose logs --tail 100 backend || echo "No logs found for backend"

    echo "--- 2. Fixing Port Conflict (if any) ---"
    # Ensure backend uses 8001:8000 for external access to avoid conflict with yaw-backend on 8000
    # This should already be in the docker-compose.yml but we'll restart specifically.

    echo "--- 3. Re-syncing and Restarting specifically ---"
    docker compose down
    
    # Try to run migrations inside a temporary container to fix DB state
    echo "⚙️ Running migrations..."
    docker compose run --rm backend python manage.py migrate --noinput || echo "Migration failed, continuing..."

    echo "🚀 Starting containers..."
    docker compose up -d

    echo "--- 4. Checking Status Again ---"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
EOF

echo "✅ Fix attempted! Review the logs above to see if migrations or port conflicts caused the exit."
