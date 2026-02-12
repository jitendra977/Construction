#!/bin/bash

# Exit on error
set -e

if [ "$DATABASE_URL" != "" ] && [[ "$DATABASE_URL" == postgres* ]]; then
    echo "Waiting for postgres..."
    while ! pg_isready -h db -p 5432 -U construction_user; do
      sleep 1
    done
    echo "PostgreSQL started"
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."
exec "$@"
