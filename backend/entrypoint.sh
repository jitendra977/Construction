#!/bin/bash

# Exit on error
set -e

# Wait for database
if [ -n "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:$DB_PORT..."
    # Use python to check database connectivity
    python << END
import socket
import time
import os

host = os.environ.get('DB_HOST', 'mysql_db')
port = int(os.environ.get('DB_PORT', 3306))

s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
for _ in range(30):
    try:
        s.connect((host, port))
        s.close()
        break
    except socket.error:
        time.sleep(1)
END
    echo "Database is up!"
elif [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database from DATABASE_URL..."
    sleep 10
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."
exec "$@"
