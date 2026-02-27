def populate():
    from apps.finance.models import BudgetCategory
    from apps.core.models import HouseProject
    
    project = HouseProject.objects.first()
    total_budget = project.total_budget if project else 35000000
    
    from decimal import Decimal
    
    categories = [
        {'name': 'Civil Materials', 'allocation': total_budget * Decimal('0.35'), 'desc': 'Cement, Sand, Bricks, Steel, etc.'},
        {'name': 'Labor & Contractors', 'allocation': total_budget * Decimal('0.20'), 'desc': 'Payments to Mistris, helpers, and thekedaars.'},
        {'name': 'Finishing & Interior', 'allocation': total_budget * Decimal('0.30'), 'desc': 'Tiles, Marble, Paint, Woodwork, Furniture, and Interior Design.'},
        {'name': 'MEP (Plumbing & Electrical)', 'allocation': total_budget * Decimal('0.08'), 'desc': 'Electrical wires, Pipes, Sanitaries.'},
        {'name': 'Permits & Government Fees', 'allocation': total_budget * Decimal('0.04'), 'desc': 'Nagar Palika fees, Naksa darta, etc.'},
        {'name': 'Professional Fees', 'allocation': total_budget * Decimal('0.02'), 'desc': 'Engineer and Architect fees.'},
        {'name': 'Miscellaneous', 'allocation': total_budget * Decimal('0.01'), 'desc': 'Site tea, snacks, small tools.'},
    ]

    for cat_data in categories:
        cat, created = BudgetCategory.objects.get_or_create(
            name=cat_data['name'],
            defaults={
                'description': cat_data['desc'],
                'allocation': cat_data['allocation']
            }
        )
        if created:
            print(f"Created budget category: {cat.name}")
        else:
            cat.allocation = cat_data['allocation']
            cat.description = cat_data['desc']
            cat.save()
            print(f"Updated budget category: {cat.name}")

if __name__ == '__main__':
    populate()
