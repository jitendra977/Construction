from datetime import date, timedelta
from decimal import Decimal

def populate():
    from apps.resources.models import Material, MaterialTransaction, Supplier
    from apps.finance.models import FundingSource
    from apps.core.models import ConstructionPhase
    
    # Dependencies
    opc_cement = Material.objects.filter(name='OPC Cement').first()
    steel_12mm = Material.objects.filter(name='Steel Rod (12mm)').first()
    bricks = Material.objects.filter(name='Bricks (Number 1)').first()
    
    everest_cement = Supplier.objects.filter(name='Everest Cement Traders').first()
    jagadamba_steel = Supplier.objects.filter(name='Jagadamba Steel Depot').first()
    
    own_funds = FundingSource.objects.filter(source_type='OWN_MONEY').first()
    
    phase1 = ConstructionPhase.objects.filter(order=1).first()
    phase2 = ConstructionPhase.objects.filter(order=2).first()
    
    if not all([opc_cement, steel_12mm, bricks, own_funds, phase1]):
        print("Required dependencies for transactions not found. Skipping.")
        return

    transactions = [
        # 1. INITIAL PURCHASES (Stock IN)
        {
            'material': opc_cement,
            'type': 'IN',
            'qty': 100,
            'price': 750,
            'date': date.today() - timedelta(days=10),
            'supplier': everest_cement,
            'purpose': 'Bulk purchase for foundation',
            'phase': None
        },
        {
            'material': steel_12mm,
            'type': 'IN',
            'qty': 20,
            'price': 9500,
            'date': date.today() - timedelta(days=9),
            'supplier': jagadamba_steel,
            'purpose': 'Structural steel',
            'phase': None
        },
        {
            'material': bricks,
            'type': 'IN',
            'qty': 5000,
            'price': 18,
            'date': date.today() - timedelta(days=8),
            'supplier': None,
            'purpose': 'First lot of bricks',
            'phase': None
        },
        
        # 2. USAGE (Stock OUT)
        {
            'material': opc_cement,
            'type': 'OUT',
            'qty': 10,
            'price': None, # Will use avg cost
            'date': date.today() - timedelta(days=5),
            'supplier': None,
            'purpose': 'Mortar for site shed',
            'phase': phase1
        },
        {
            'material': bricks,
            'type': 'OUT',
            'qty': 1500,
            'price': None,
            'date': date.today() - timedelta(days=4),
            'supplier': None,
            'purpose': 'Shed walls',
            'phase': phase1
        },
        {
            'material': opc_cement,
            'type': 'OUT',
            'qty': 30,
            'price': None,
            'date': date.today() - timedelta(days=2),
            'supplier': None,
            'purpose': 'Foundation concrete',
            'phase': phase2
        },
    ]

    for t_data in transactions:
        transaction = MaterialTransaction.objects.create(
            material=t_data['material'],
            transaction_type=t_data['type'],
            quantity=Decimal(str(t_data['qty'])),
            unit_price=Decimal(str(t_data['price'])) if t_data['price'] else None,
            date=t_data['date'],
            supplier=t_data['supplier'],
            funding_source=own_funds if t_data['type'] == 'IN' else None,
            purpose=t_data['purpose'],
            phase=t_data['phase'],
            status='RECEIVED',
            create_expense=True
        )
        print(f"Created {t_data['type']} transaction for {t_data['material'].name}: {t_data['qty']} units")

if __name__ == '__main__':
    populate()
