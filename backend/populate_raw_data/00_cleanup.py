import os
import django

def populate():
    from django.db import connection
    
    print("Cleaning up old data (Aggressive Reset)...")
    
    tables_to_clean = [
        'tasks_taskupdate', 'tasks_taskmedia', 'tasks_task',
        'resources_materialtransaction', 'finance_payment', 'finance_fundingtransaction',
        'finance_expense', 'finance_fundingsource', 'finance_budgetcategory',
        'resources_material', 'resources_supplier', 'resources_contractor',
        'core_room', 'core_floor', 'core_constructionphase', 'core_houseproject',
        'permits_permitstep', 'permits_legaldocument', 'resources_document',
        'accounts_activitylog', 'accounts_user', 'accounts_role'
    ]
    
    db_engine = connection.vendor
    
    with connection.cursor() as cursor:
        print(f"Detected database engine: {db_engine}")
        
        # Disable foreign key checks
        if db_engine == 'mysql':
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        elif db_engine == 'sqlite':
            cursor.execute("PRAGMA foreign_keys = OFF;")
        
        for table in tables_to_clean:
            print(f"Cleaning table {table}...")
            try:
                if db_engine == 'mysql':
                    cursor.execute(f"TRUNCATE TABLE {table};")
                else:
                    cursor.execute(f"DELETE FROM {table};")
                    if db_engine == 'sqlite':
                        try:
                            cursor.execute(f"DELETE FROM sqlite_sequence WHERE name='{table}';")
                        except:
                            pass
            except Exception as e:
                print(f"Cleanup failed for {table}. Error: {e}")
                try:
                    cursor.execute(f"DELETE FROM {table};")
                except:
                    pass
        
        # Re-enable foreign key checks
        if db_engine == 'mysql':
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
        elif db_engine == 'sqlite':
            cursor.execute("PRAGMA foreign_keys = ON;")
    
    print("Cleanup complete.")

if __name__ == '__main__':
    populate()
