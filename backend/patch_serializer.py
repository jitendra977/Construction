import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

with open('apps/core/serializers.py', 'r') as f:
    content = f.read()

import re

old_code = """    def to_representation(self, instance):
        repr = super().to_representation(instance)
        try:
            from apps.financials.models.budget import BudgetAllocation
            from django.db.models import Sum
            allocs = BudgetAllocation.objects.filter(phase=instance).aggregate(total=Sum('allocated_amount'))['total']
            if allocs is not None:
                repr['estimated_budget'] = str(allocs)
        except Exception:
            pass
        return repr"""

new_code = """    def to_representation(self, instance):
        repr = super().to_representation(instance)
        try:
            from apps.financials.models.budget import BudgetAllocation
            from django.db.models import Sum
            allocations = BudgetAllocation.objects.filter(phase=instance).select_related('category')
            
            allocs_total = allocations.aggregate(total=Sum('allocated_amount'))['total']
            if allocs_total is not None:
                repr['estimated_budget'] = str(allocs_total)
            
            # Add breakdown for frontend
            repr['budget_breakdown'] = [
                {
                    "category_id": str(a.category.id),
                    "category_name": a.category.name,
                    "amount": str(a.allocated_amount)
                } for a in allocations
            ]
        except Exception:
            pass
        return repr"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('apps/core/serializers.py', 'w') as f:
        f.write(content)
    print("Patched serializers.py successfully!")
else:
    print("Could not find old_code in serializers.py")
