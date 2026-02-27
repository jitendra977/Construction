import os
import django

def populate():
    from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
    from apps.finance.models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction
    from apps.resources.models import Supplier, Contractor, Material, MaterialTransaction, Document
    from apps.tasks.models import Task, TaskMedia, TaskUpdate
    from apps.permits.models import PermitStep, LegalDocument
    
    from django.db import connection
    
    print("Cleaning up old data (Aggressive Reset)...")
    
    tables_to_clean = [
        'tasks_taskupdate', 'tasks_taskmedia', 'tasks_task',
        'resources_materialtransaction', 'finance_payment', 'finance_fundingtransaction',
        'finance_expense', 'finance_fundingsource', 'finance_budgetcategory',
        'resources_material', 'resources_supplier', 'resources_contractor',
        'core_room', 'core_floor', 'core_constructionphase', 'core_houseproject',
        'permits_permitstep', 'permits_legaldocument', 'resources_document'
    ]
    
    with connection.cursor() as cursor:
        print("Disabling foreign key checks...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
        
        for table in tables_to_clean:
            print(f"Truncating table {table}...")
            try:
                cursor.execute(f"TRUNCATE TABLE {table};")
            except Exception as e:
                print(f"Truncate failed for {table}, trying DELETE. Error: {e}")
                cursor.execute(f"DELETE FROM {table};")
        
        print("Enabling foreign key checks...")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

    print("Cleanup complete.")

if __name__ == '__main__':
    populate()
