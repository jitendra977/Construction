import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.financials.models.budget import BudgetCategory
cat = BudgetCategory.objects.get(name__startswith='Levelling')
print(cat.fin_allocations.all().values())
