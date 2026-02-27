from datetime import date

def populate():
    from apps.core.models import ConstructionPhase
    
    phases = [
        {'name': 'Site Preparation & Mobilization', 'order': 1, 'estimated_budget': 150000, 'description': 'Clearing site, temporary shed, water, electricity.'},
        {'name': 'Excavation & Earthwork (Jag Khanne)', 'order': 2, 'estimated_budget': 300000, 'description': 'Excavation for footings and underground water tank.'},
        {'name': 'Foundation & DPC', 'order': 3, 'estimated_budget': 1500000, 'description': 'PCC, Footing, Plinth Beam, and Damp Proof Course.'},
        {'name': 'Superstructure - Ground Floor', 'order': 4, 'estimated_budget': 1800000, 'description': 'Columns (Pillers), Walls, and Slab casting.'},
        {'name': 'Superstructure - First Floor', 'order': 5, 'estimated_budget': 1500000, 'description': 'Columns, Walls, and Slab casting.'},
        {'name': 'Superstructure - Top Floor/Staircase Cover', 'order': 6, 'estimated_budget': 800000, 'description': 'Upper rooms and roof casting.'},
        {'name': 'Finishing - Plaster & Putty', 'order': 7, 'estimated_budget': 800000, 'description': 'Internal and external plastering.'},
        {'name': 'Finishing - Flooring & Tiling', 'order': 8, 'estimated_budget': 1000000, 'description': 'Marble, Tiles, and Parqueting.'},
        {'name': 'MEP - Electrical & Plumbing', 'order': 9, 'estimated_budget': 600000, 'description': 'Wiring, piping, and fixtures.'},
        {'name': 'Interior & Woodwork', 'order': 10, 'estimated_budget': 1000000, 'description': 'Wall painting, interior design, and furniture.'},
        {'name': 'Exterior & Landscaping', 'order': 11, 'estimated_budget': 350000, 'description': 'Compound wall, gate, and garden.'},
        {'name': 'Final Handover', 'order': 12, 'estimated_budget': 200000, 'description': 'Deep cleaning and final inspection.'},
    ]

    for phase_data in phases:
        phase, created = ConstructionPhase.objects.get_or_create(
            name=phase_data['name'],
            defaults={
                'order': phase_data['order'],
                'estimated_budget': phase_data['estimated_budget'],
                'description': phase_data['description'],
                'status': 'PENDING'
            }
        )
        if created:
            print(f"Created phase: {phase.name}")
        else:
            phase.order = phase_data['order']
            phase.estimated_budget = phase_data['estimated_budget']
            phase.description = phase_data['description']
            phase.save()
            print(f"Updated phase: {phase.name}")

if __name__ == '__main__':
    populate()
