from datetime import date

def populate():
    from apps.core.models import ConstructionPhase
    
    phases = [
        {'name': 'Site Preparation & Mobilization', 'order': 1, 'estimated_budget': 500000, 'description': 'Clearing site, temporary shed, water, electricity.'},
        {'name': 'Excavation & Earthwork (Jag Khanne)', 'order': 2, 'estimated_budget': 1200000, 'description': 'Excavation for footings and underground water tank.'},
        {'name': 'Foundation & DPC', 'order': 3, 'estimated_budget': 4500000, 'description': 'PCC, Footing, Plinth Beam, and Damp Proof Course.'},
        {'name': 'Superstructure - Ground Floor', 'order': 4, 'estimated_budget': 5500000, 'description': 'Columns (Pillers), Walls, and Slab casting.'},
        {'name': 'Superstructure - First Floor', 'order': 5, 'estimated_budget': 5000000, 'description': 'Columns, Walls, and Slab casting.'},
        {'name': 'Superstructure - Top Floor/Staircase Cover', 'order': 6, 'estimated_budget': 3500000, 'description': 'Upper rooms and roof casting.'},
        {'name': 'Finishing - Plaster & Putty', 'order': 7, 'estimated_budget': 4000000, 'description': 'Internal and external plastering.'},
        {'name': 'Finishing - Flooring & Tiling', 'order': 8, 'estimated_budget': 3000000, 'description': 'Marble, Tiles, and Parqueting.'},
        {'name': 'MEP - Electrical & Plumbing', 'order': 9, 'estimated_budget': 2500000, 'description': 'Wiring, piping, and fixtures.'},
        {'name': 'Painting & Woodwork', 'order': 10, 'estimated_budget': 2000000, 'description': 'Wall painting and doors/windows installation.'},
        {'name': 'Exterior & Landscaping', 'order': 11, 'estimated_budget': 1500000, 'description': 'Compound wall, gate, and garden.'},
        {'name': 'Final Handover', 'order': 12, 'estimated_budget': 500000, 'description': 'Deep cleaning and final inspection.'},
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
