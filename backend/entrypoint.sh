#!/bin/bash

# Exit on error
set -e

if [ "$DATABASE_URL" != "" ] && [[ "$DATABASE_URL" == mysql* ]]; then
    echo "Waiting for mysql..."
    # Parse host/user/pass from DATABASE_URL or use env vars if available for mysqladmin
    # Simplified check: just wait a bit or check tcp port if nc is available (but we didn't install netcat)
    # Better: Use python script or mysqladmin if credentials are easy. 
    # For now, let's just sleep to be safe as mysqladmin might need password in env.
    sleep 10 
    echo "MySQL started (assumed)"
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."
exec "$@"
