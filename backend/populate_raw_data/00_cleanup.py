import os
import django

def populate():
    from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
    from apps.finance.models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction
    from apps.resources.models import Supplier, Contractor, Material, MaterialTransaction, Document
    from apps.tasks.models import Task, TaskMedia, TaskUpdate
    from apps.permits.models import PermitStep, LegalDocument
    
    from django.db import transaction
    
    print("Cleaning up old data...")
    
    with transaction.atomic():
        # Order matters for foreign keys
        print(f"Deleting Task updates: {TaskUpdate.objects.all().delete()[0]}")
        print(f"Deleting Task media: {TaskMedia.objects.all().delete()[0]}")
        print(f"Deleting Tasks: {Task.objects.all().delete()[0]}")
        
        print(f"Deleting Material transactions: {MaterialTransaction.objects.all().delete()[0]}")
        print(f"Deleting Expenses: {Expense.objects.all().delete()[0]}")
        print(f"Deleting Payments: {Payment.objects.all().delete()[0]}")
        print(f"Deleting Funding transactions: {FundingTransaction.objects.all().delete()[0]}")
        print(f"Deleting Funding sources: {FundingSource.objects.all().delete()[0]}")
        print(f"Deleting Budget categories: {BudgetCategory.objects.all().delete()[0]}")
        
        print(f"Deleting Materials: {Material.objects.all().delete()[0]}")
        print(f"Deleting Suppliers: {Supplier.objects.all().delete()[0]}")
        print(f"Deleting Contractors: {Contractor.objects.all().delete()[0]}")
        
        print(f"Deleting Rooms: {Room.objects.all().delete()[0]}")
        print(f"Deleting Floors: {Floor.objects.all().delete()[0]}")
        print(f"Deleting Construction phases: {ConstructionPhase.objects.all().delete()[0]}")
        print(f"Deleting House projects: {HouseProject.objects.all().delete()[0]}")
        
        print(f"Deleting Permit steps: {PermitStep.objects.all().delete()[0]}")
        print(f"Deleting Legal documents: {LegalDocument.objects.all().delete()[0]}")
        print(f"Deleting Documents: {Document.objects.all().delete()[0]}")

    print("Cleanup complete.")

if __name__ == '__main__':
    populate()
