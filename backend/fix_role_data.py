import os
import django
from django.db import connection, transaction

# 1. Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.accounts.models import Role

User = get_user_model()

def fix_roles():
    print("🚀 Starting Advanced Role Data Repair...")
    
    # 2. Get the actual column name for the 'role' field
    role_column = User._meta.get_field('role').column
    print(f"📝 Target column in database: {role_column}")

    # 3. Use raw SQL to update the values
    with connection.cursor() as cursor:
        # Find all unique non-numeric values in that column
        if connection.vendor == 'sqlite':
            cursor.execute(f"SELECT DISTINCT {role_column} FROM accounts_user")
        else:
            cursor.execute(f"SELECT DISTINCT {role_column} FROM accounts_user WHERE {role_column} IS NOT NULL")
        
        unique_vals = [row[0] for row in cursor.fetchall()]
        print(f"🕵️  Found unique values in {role_column}: {unique_vals}")
        
        updates = 0
        for val in unique_vals:
            if val is None or str(val).isdigit():
                continue
            
            print(f"🔄 Processing legacy value: '{val}'")
            
            # Ensure the role exists in the Role table
            # We use code=val and capitalize the name
            name = val.replace('_', ' ').title()
            role, created = Role.objects.get_or_create(
                code=val, 
                defaults={'name': name}
            )
            if created:
                print(f"   ✨ Created missing Role: {name}")
            
            print(f"   ➡️  Mapping '{val}' -> ID {role.id}")
            
            # Execute update using raw SQL to bypass Django's validation at this stage
            with transaction.atomic():
                cursor.execute(
                    f"UPDATE accounts_user SET {role_column} = %s WHERE {role_column} = %s",
                    [role.id, val]
                )
            updates += 1

    print(f"✨ Repair complete! Successfully mapped {updates} string values to numeric IDs.")

if __name__ == "__main__":
    fix_roles()
