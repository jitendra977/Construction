import os
import django

def populate():
    from apps.accounts.models import User
    
    # Create additional users if needed
    users = [
        {'username': 'contractor_main', 'email': 'contractor@example.com', 'role': 'CONTRACTOR', 'password': 'password123'},
        {'username': 'engineer_ram', 'email': 'ram@example.com', 'role': 'ENGINEER', 'password': 'password123'},
    ]

    for user_data in users:
        if not User.objects.filter(username=user_data['username']).exists():
            User.objects.create_user(
                username=user_data['username'],
                email=user_data['email'],
                password=user_data['password'],
                role=user_data['role']
            )
            print(f"Created user: {user_data['username']}")
        else:
            print(f"User {user_data['username']} already exists")

if __name__ == '__main__':
    populate()
