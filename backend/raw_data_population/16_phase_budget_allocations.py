def populate():
    from apps.finance.models import BudgetCategory, PhaseBudgetAllocation
    from apps.core.models import ConstructionPhase
    from decimal import Decimal

    civil_cat = BudgetCategory.objects.filter(name='Civil Materials').first()
    labor_cat = BudgetCategory.objects.filter(name='Labor & Contractors').first()
    
    phases = ConstructionPhase.objects.all().order_by('order')
    
    if not civil_cat or not phases:
        print("Missing categories or phases for allocation. Skipping.")
        return

    # Distribute Civil Materials budget to early phases
    allocations = [
        {'category': civil_cat, 'phase': phases.filter(order=2).first(), 'amount': 100000, 'notes': 'Excavation materials'},
        {'category': civil_cat, 'phase': phases.filter(order=3).first(), 'amount': 1000000, 'notes': 'Foundation cement/steel'},
        {'category': civil_cat, 'phase': phases.filter(order=4).first(), 'amount': 1200000, 'notes': 'Ground floor structure'},
        {'category': labor_cat, 'phase': phases.filter(order=3).first(), 'amount': 500000, 'notes': 'Foundation labor'},
    ]

    for a_data in allocations:
        if not a_data['phase']: continue
        
        alloc, created = PhaseBudgetAllocation.objects.get_or_create(
            category=a_data['category'],
            phase=a_data['phase'],
            defaults={
                'amount': Decimal(str(a_data['amount'])),
                'notes': a_data['notes']
            }
        )
        if created:
            print(f"Created budget allocation: {a_data['category'].name} -> {a_data['phase'].name}")
        else:
            alloc.amount = Decimal(str(a_data['amount']))
            alloc.notes = a_data['notes']
            alloc.save()
            print(f"Updated budget allocation: {a_data['category'].name} -> {a_data['phase'].name}")

if __name__ == '__main__':
    populate()
