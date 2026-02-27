import os
import django

def populate():
    from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
    from apps.finance.models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction
    from apps.resources.models import Supplier, Contractor, Material, MaterialTransaction, Document
    from apps.tasks.models import Task, TaskMedia, TaskUpdate
    from apps.permits.models import PermitStep, LegalDocument
    
    from django.db import transaction, connection
    
    print("Cleaning up old data...")
    
    models_to_clean = [
        TaskUpdate, TaskMedia, Task,
        MaterialTransaction, Expense, Payment, FundingTransaction, FundingSource, BudgetCategory,
        Material, Supplier, Contractor,
        Room, Floor, ConstructionPhase, HouseProject,
        PermitStep, LegalDocument, Document
    ]
    
    with transaction.atomic():
        for model in models_to_clean:
            count = model.objects.all().count()
            if count > 0:
                print(f"Deleting {count} records from {model.__name__}...")
                model.objects.all().delete()
                # Double check
                remaining = model.objects.all().count()
                if remaining > 0:
                    print(f"Warning: {remaining} records remain in {model.__name__}. Trying raw SQL...")
                    with connection.cursor() as cursor:
                        table_name = model._meta.db_table
                        cursor.execute(f"DELETE FROM {table_name}")
                    print(f"Now {model.objects.all().count()} records remain.")

    print("Cleanup complete.")

if __name__ == '__main__':
    populate()
