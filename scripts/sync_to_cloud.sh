#!/bin/bash

# Configuration
LOCAL_PROJECT_DIR=$(pwd)
SERVER_USER="nishanaweb"
SERVER_HOST="nishanaweb.cloud"
SERVER_DIR="~/project/Construction"
DUMP_FILE="data_sync_$(date +%Y%m%d_%H%M%S).json"

echo "🚀 Starting Data Sync from Local to Cloud..."

# 1. Export local data
echo "📦 Dumping local data from SQLite..."
cd backend
# Robust venv detection
if [ -f "venv/bin/activate" ]; then
    echo "📍 Found venv at backend/venv/"
    # Unset DB variables to force SQLite usage for local dump
    export DB_NAME="" DB_USER="" DB_PASSWORD="" DB_HOST="" DB_PORT=""
    
    echo "⚙️  Running local migrations to ensure database schema is up-to-date..."
    ./venv/bin/python manage.py migrate

    # Run dumpdata using the python in that venv directly
    ./venv/bin/python manage.py dumpdata --exclude auth.permission --exclude contenttypes --exclude admin.logentry --indent 2 > ../$DUMP_FILE
else
    echo "⚠️  No venv found in backend/venv/. Trying system python..."
    # Unset DB variables to force SQLite usage for local dump
    export DB_NAME="" DB_USER="" DB_PASSWORD="" DB_HOST="" DB_PORT=""
    
    echo "⚙️  Running local migrations to ensure database schema is up-to-date..."
    python3 manage.py migrate
    
    python3 manage.py dumpdata --exclude auth.permission --exclude contenttypes --exclude admin.logentry --indent 2 > ../$DUMP_FILE
fi
cd ..

if [ ! -s "$DUMP_FILE" ]; then
    echo "❌ Error: Failed to create data dump or dump is empty."
    # List files to help debug
    ls -la backend/
    exit 1
fi

# 2. Upload to server
echo "📤 Uploading data dump ( $(ls -lh $DUMP_FILE | awk '{print $5}') ) to server..."
scp "$DUMP_FILE" "$SERVER_USER@$SERVER_HOST:$SERVER_DIR/backend/"

# 3. Import data in cloud
echo "⚙️ Importing data into Cloud MySQL..."
# Note: Using interactive-ish shell to ensure path expansion works
ssh -t "$SERVER_USER@$SERVER_HOST" "cd /home/nishanaweb/project/Construction && \
    docker cp backend/$DUMP_FILE construction-backend-1:/app/ && \
    docker exec -it construction-backend-1 python manage.py loaddata /app/$DUMP_FILE && \
    rm backend/$DUMP_FILE"

echo "✅ Data Sync Complete! Visit https://construction.nishanaweb.cloud to verify."
