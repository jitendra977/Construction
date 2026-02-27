import os
import django

def populate():
    from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
    from apps.finance.models import BudgetCategory, Expense, Payment, FundingSource, FundingTransaction
    from apps.resources.models import Supplier, Contractor, Material, MaterialTransaction, Document
    from apps.tasks.models import Task, TaskMedia, TaskUpdate
    from apps.permits.models import PermitStep, LegalDocument
    
    print("Cleaning up old data...")
    
    # Order matters for foreign keys
    TaskUpdate.objects.all().delete()
    TaskMedia.objects.all().delete()
    Task.objects.all().delete()
    
    MaterialTransaction.objects.all().delete()
    Expense.objects.all().delete()
    Payment.objects.all().delete()
    FundingTransaction.objects.all().delete()
    FundingSource.objects.all().delete()
    BudgetCategory.objects.all().delete()
    
    Material.objects.all().delete()
    Supplier.objects.all().delete()
    Contractor.objects.all().delete()
    
    Room.objects.all().delete()
    Floor.objects.all().delete()
    ConstructionPhase.objects.all().delete()
    HouseProject.objects.all().delete()
    
    PermitStep.objects.all().delete()
    LegalDocument.objects.all().delete()
    Document.objects.all().delete()

    print("Cleanup complete.")

if __name__ == '__main__':
    populate()
