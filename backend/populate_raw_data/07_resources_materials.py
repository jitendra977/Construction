from decimal import Decimal

def populate():
    from apps.resources.models import Material, Supplier
    from apps.finance.models import BudgetCategory
    
    # Ensure dependencies exist
    civil_cat, _ = BudgetCategory.objects.get_or_create(name='Civil Materials', defaults={'allocation': 0})
    elec_cat, _ = BudgetCategory.objects.get_or_create(name='Electrical', defaults={'allocation': 0})
    plum_cat, _ = BudgetCategory.objects.get_or_create(name='Plumbing', defaults={'allocation': 0})
    
    everest_cement = Supplier.objects.filter(name='Everest Cement Traders').first()
    jagadamba_steel = Supplier.objects.filter(name='Jagadamba Steel Depot').first()
    bhadrakali_brick = Supplier.objects.filter(name='Bhadrakali Brick Kiln').first()

    materials = [
        {'name': 'OPC Cement', 'unit': 'BORA', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': everest_cement, 'est': 500, 'cost': 750},
        {'name': 'PPC Cement', 'unit': 'BORA', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': everest_cement, 'est': 300, 'cost': 650},
        {'name': 'Baluwa (River Sand)', 'unit': 'TIPPER', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': None, 'est': 20, 'cost': 18000},
        {'name': 'Gitti (Aggregate)', 'unit': 'TIPPER', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': None, 'est': 15, 'cost': 22000},
        {'name': 'Steel Rod (12mm)', 'unit': 'BUNDLE', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': jagadamba_steel, 'est': 50, 'cost': 9500},
        {'name': 'Bricks (Number 1)', 'unit': 'PCS', 'cat': 'Civil', 'budget_cat': civil_cat, 'supplier': bhadrakali_brick, 'est': 25000, 'cost': 18},
        {'name': 'PVC Pipe 4 inch', 'unit': 'PCS', 'cat': 'Plumbing', 'budget_cat': plum_cat, 'supplier': None, 'est': 40, 'cost': 1200},
        {'name': 'Electrical Wire (1.5mm)', 'unit': 'BUNDLE', 'cat': 'Electrical', 'budget_cat': elec_cat, 'supplier': None, 'est': 10, 'cost': 3500},
    ]

    for m_data in materials:
        material, created = Material.objects.get_or_create(
            name=m_data['name'],
            defaults={
                'category': m_data['cat'],
                'unit': m_data['unit'],
                'budget_category': m_data['budget_cat'],
                'supplier': m_data['supplier'],
                'quantity_estimated': Decimal(str(m_data['est'])),
                'avg_cost_per_unit': Decimal(str(m_data['cost'])),
                'min_stock_level': Decimal('10')
            }
        )
        if created:
            print(f"Created material: {material.name}")

if __name__ == '__main__':
    populate()
