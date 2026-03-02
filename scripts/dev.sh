#!/bin/bash
set -e

# Help / Usage
if [[ "$1" == "--help" ]]; then
    echo "Usage: ./recompose.sh [option]"
    echo "Options:"
    echo "  (none)      Standard restart (Safe)"
    echo "  --nuclear   Full reset (Fixes 'Invalid Hook Call' & dependency errors)"
    exit 0
fi

echo "🚀 Starting Local Development Environment..."

if [[ "$1" == "--nuclear" ]]; then
    echo "☢️  NUCLEAR MODE ACTIVATED"
    echo "🛑 Stopping containers..."
    docker compose -f docker-compose.dev.yml down -v
    
    echo "🧹 Cleaning corrupted local modules..."
    echo "   (You may be asked for your password)"
    sudo rm -rf frontend/node_modules
    sudo rm -rf frontend/bun.lockb
    sudo rm -rf frontend/package-lock.json
    sudo rm -rf frontend/dist
    
    echo "✅ Clean complete."
else
    # Standard restart
    echo "🔄 Standard Restart..."
    docker compose -f docker-compose.dev.yml down --remove-orphans
fi

echo "🏗️  Building and Starting..."
docker compose -f docker-compose.dev.yml up -d --build

echo "🔍 Verifying services..."
sleep 2
if docker ps | grep -q "construction_frontend_dev"; then
    echo "✅ Frontend is running!"
else
    echo "❌ Frontend failed to start. Check logs: docker logs construction_frontend_dev"
fi

echo "------------------------------------------------"
echo "🎉 App is ready at: http://localhost:5173"
echo "------------------------------------------------"