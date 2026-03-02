import os
import django
from decouple import config

def populate():
    from apps.accounts.models import User, Role
    
    # 0. Create Default Roles if they don't exist
    for code, name in Role.ROLE_CODES:
        Role.objects.get_or_create(code=code, defaults={'name': name})
    
    # 0.1 Create Default Superuser (Admin) - Targeted for this environment
    admin_user = 'admin'
    admin_email = 'admin@gmail.com'
    admin_pass = 'adminpass'

    user_by_email = User.objects.filter(email=admin_email).first()
    user_by_username = User.objects.filter(username=admin_user).first()

    super_admin_role, _ = Role.objects.get_or_create(
        code=Role.SUPER_ADMIN, 
        defaults={
            'name': 'Super Admin',
            'can_manage_all_systems': True,
            'can_manage_finances': True,
            'can_view_finances': True,
            'can_manage_phases': True,
            'can_view_phases': True,
            'can_manage_users': True,
        }
    )

    if user_by_email:
        print(f"Updating existing superuser by email: {admin_email}...")
        user_by_email.username = admin_user
        user_by_email.set_password(admin_pass)
        user_by_email.role = super_admin_role
        user_by_email.is_superuser = True
        user_by_email.is_staff = True
        user_by_email.save()
    elif user_by_username:
        print(f"Updating existing superuser by username: {admin_user}...")
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
        print(f"Superuser {admin_email} created successfully.")

    # 1. Create realistic Nepali users across different roles
    users = [
        {
            'username': 'jitendra_owner', 
            'email': 'jitendra@example.com', 
            'role_code': Role.HOME_OWNER, 
            'password': 'password123',
            'first_name': 'Jitendra',
            'last_name': 'Khadka'
        },
        {
            'username': 'ram_engineer', 
            'email': 'ram.engineer@example.com', 
            'role_code': Role.LEAD_ENGINEER, 
            'password': 'password123',
            'first_name': 'Ram',
            'last_name': 'Prasad'
        },
        {
            'username': 'shyam_contractor', 
            'email': 'shyam.contractor@example.com', 
            'role_code': Role.CONTRACTOR, 
            'password': 'password123',
            'first_name': 'Shyam',
            'last_name': 'Bahadur'
        },
        {
            'username': 'sita_viewer', 
            'email': 'sita.viewer@example.com', 
            'role_code': Role.VIEWER, 
            'password': 'password123',
            'first_name': 'Sita',
            'last_name': 'Kumari'
        },
    ]

    for user_data in users:
        if not User.objects.filter(email=user_data['email']).exists():
            role_obj = Role.objects.get(code=user_data['role_code'])
            User.objects.create_user(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'],
                role=role_obj,
                first_name=user_data.get('first_name', ''),
                last_name=user_data.get('last_name', '')
            )
            print(f"Created user: {user_data['username']} ({user_data['email']}) as {user_data['role_code']}")
        else:
            print(f"User with email {user_data['email']} already exists")

if __name__ == '__main__':
    import sys
    sys.path.append('.')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()
    populate()
