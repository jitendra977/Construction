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

echo "Ensuring default admin user (admin@gmail.com) and roles exist..."
python manage.py shell <<EOF
from apps.accounts.models import User, Role
for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={'name': name})

admin_email = 'admin@gmail.com'
admin_user = 'admin'
admin_pass = 'adminpass'

user_by_email = User.objects.filter(email=admin_email).first()
user_by_username = User.objects.filter(username=admin_user).first()

super_admin_role, _ = Role.objects.get_or_create(
    code=Role.SUPER_ADMIN, 
    defaults={'name': 'Super Admin', 'can_manage_all_systems': True}
)

if user_by_email:
    print(f"Updating existing user by email: {admin_email}...")
    user_by_email.username = admin_user
    user_by_email.set_password(admin_pass)
    user_by_email.role = super_admin_role
    user_by_email.is_superuser = True
    user_by_email.is_staff = True
    user_by_email.save()
elif user_by_username:
    print(f"Updating existing user by username: {admin_user}...")
    user_by_username.email = admin_email
    user_by_username.set_password(admin_pass)
    user_by_username.role = super_admin_role
    user_by_username.is_superuser = True
    user_by_username.is_staff = True
    user_by_username.save()
else:
    print(f"Creating superuser: {admin_email}...")
    User.objects.create_superuser(
        username=admin_user,
        email=admin_email,
        password=admin_pass,
        role=super_admin_role
    )
    print("Superuser created successfully.")
EOF

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting server..."
exec "$@"
