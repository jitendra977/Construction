#!/bin/bash

# Exit on error
set -e

echo "Waiting for database..."
sleep 2

echo "Running migrations..."
python manage.py migrate --noinput

echo "Ensuring default admin user (admin@gmail.com) exists..."
python manage.py shell <<EOF
from apps.accounts.models import User, Role
for code, name in Role.ROLE_CODES:
    Role.objects.get_or_create(code=code, defaults={'name': name})

admin_email = 'admin@gmail.com'
admin_user = 'admin'
admin_pass = 'adminpass'

# Check if user exists by email or username
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

echo "Starting development server..."
exec "$@"
