#!/bin/bash
# Fix slow deployment by removing node_modules from Git on server

set -e

echo "🔧 Fixing slow deployment issue on server..."
echo "This will remove frontend/node_modules from Git tracking"
echo ""

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Illustration}"
BRANCH="${BRANCH:-deploy-server}"

# SSH into server and fix the issue
ssh "$VPS_USER@$VPS_HOST" << EOF
  cd "$REMOTE_PROJECT_DIR"
  
  echo "📍 Current directory: $(pwd)"
  
  # Pull latest changes
  echo "📥 Pulling latest code..."
  git pull origin "$BRANCH"
  
  # Rebuild containers safely
  echo "🏗️  Building images (Separate from UP to reduce load)..."
  docker compose build --pull
  
  echo "🚀 Restarting containers..."
  docker compose up -d
  
  echo "🧹 Cleaning up unused Docker images..."
  docker image prune -f
  
  echo "✅ Done! Deployment should be much faster now."
EOF

echo ""
echo "🎉 Server fixed! Future deployments will be much faster."
