import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.financials.models.budget import BudgetAllocation

def run():
    alloc = BudgetAllocation.objects.filter(category__name__startswith="Other Items").first()
    if alloc:
        alloc.phase_id = 20 # Finishing
        alloc.save()
        print("Fixed Other Items.")
run()
