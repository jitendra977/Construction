#!/bin/bash

# Exit on error
set -e

echo "Waiting for database..."
sleep 2

echo "Running migrations..."
python manage.py migrate --noinput

echo "Starting development server..."
exec "$@"
