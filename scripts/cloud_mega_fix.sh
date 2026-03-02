#!/bin/bash

# Configuration
VPS_USER="${VPS_USER:-nishanaweb}"
VPS_HOST="${VPS_HOST:-nishanaweb.cloud}"
REMOTE_PROJECT_DIR="${REMOTE_PROJECT_DIR:-/home/nishanaweb/project/Construction}"
NPM_DIR="/home/nishanaweb/nginx-proxy-manager"

echo "🚀 Starting COMPLETE Cloud Fix..."

# First, ensure the shared network exists
echo "🌐 Ensuring app-network exists on server..."
ssh -t "$VPS_USER@$VPS_HOST" "docker network create app-network || true"

# Then, run the full configuration fix
ssh -t "$VPS_USER@$VPS_HOST" << EOF
    set -e
    
    # 1. Correct Nginx Proxy Manager (NPM)
    echo "🔧 Configuring Nginx Proxy Manager at $NPM_DIR..."
    cat <<INTERNAL_EOF > "$NPM_DIR/docker-compose.yml"
services:
  app:
    image: 'jc21/nginx-proxy-manager:latest'
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - '80:80'
      - '81:81'
      - '443:443'
    volumes:
      - ./data:/data
      - ./letsencrypt:/etc/letsencrypt
    environment:
      - DISABLE_IPV6=true
    networks:
      - default
      - app-network

networks:
  app-network:
    external: true
    name: app-network
INTERNAL_EOF

    cd "$NPM_DIR"
    echo "♻️ Restarting NPM..."
    docker compose down
    docker compose up -d

    # 2. Correct Construction App Containers
    echo "🏗️ Updating Construction App at $REMOTE_PROJECT_DIR..."
    cd "$REMOTE_PROJECT_DIR"
    git pull origin deploy-server
    
    echo "♻️ Rebuilding and Restarting Construction Containers..."
    docker compose down
    docker compose build --pull
    docker compose up -d

    # 3. Final Cleanup
    echo "🧹 Cleaning up old Docker images..."
    docker image prune -f

    # 4. Check Status
    echo "✅ All containers corrected! Current status:"
    docker ps --format \"table {{.Names}}\t{{.Status}}\t{{.Ports}}\"
EOF

echo "🎉 Cloud mega-fix complete! Visit https://construction.nishanaweb.cloud to verify."
