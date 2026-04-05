from datetime import date

def populate():
    from apps.core.models import ConstructionPhase
    
    phases = [
        {
            'name': 'Site Preparation & Mobilization', 
            'order': 1, 
            'estimated_budget': 150000, 
            'description': 'Clearing the construction site, building a temporary worker shed (Ghar-tapara), and setting up essential water and electricity connections.',
            'start_date': date(2025, 3, 1),
            'end_date': date(2025, 3, 10),
            'permit_required': False
        },
        {
            'name': 'Excavation & Earthwork (Jag Khanne)', 
            'order': 2, 
            'estimated_budget': 300000, 
            'description': 'Excavating soil for the house foundation and digging the underground water tank (Reserve Tank) to ensure a solid structural base.',
            'start_date': date(2025, 3, 11),
            'end_date': date(2025, 3, 25),
            'permit_required': True
        },
        {
            'name': 'Foundation & DPC', 
            'order': 3, 
            'estimated_budget': 1500000, 
            'description': 'Laying PCC, constructing the footing, plinth beams, and applying the Damp Proof Course (DPC) to prevent moisture from rising.',
            'start_date': date(2025, 3, 26),
            'end_date': date(2025, 4, 15),
            'permit_required': True
        },
        {
            'name': 'Superstructure - Ground Floor', 
            'order': 4, 
            'estimated_budget': 1800000, 
            'description': 'Erecting columns (pillers), masonry wall construction, and casting the ground floor slab (Dhalaan).',
            'start_date': date(2025, 4, 16),
            'end_date': date(2025, 5, 10),
            'permit_required': True
        },
        {
            'name': 'Superstructure - First Floor', 
            'order': 5, 
            'estimated_budget': 1500000, 
            'description': 'Repeating the structural process for the first floor: column erection, wall masonry, and roof slab casting.',
            'start_date': date(2025, 5, 11),
            'end_date': date(2025, 5, 30),
            'permit_required': True
        },
        {
            'name': 'Superstructure - Top Floor/Staircase Cover', 
            'order': 6, 
            'estimated_budget': 800000, 
            'description': 'Constructing the staircase cover (Sinka), upper small rooms, and finishing the terrace roofing.',
            'start_date': date(2025, 6, 1),
            'end_date': date(2025, 6, 15),
            'permit_required': True
        },
        {
            'name': 'Finishing - Plaster & Putty', 
            'order': 7, 
            'estimated_budget': 800000, 
            'description': 'Applying internal and external plastering for wall smoothness, followed by a coat of putty to prepare for painting.',
            'start_date': date(2025, 6, 16),
            'end_date': date(2025, 7, 10),
            'permit_required': False
        },
        {
            'name': 'Finishing - Flooring & Tiling', 
            'order': 8, 
            'estimated_budget': 1000000, 
            'description': 'Installing high-quality marble, ceramic tiles in bathrooms/kitchen, and specialized flooring like parqueting in bedrooms.',
            'start_date': date(2025, 7, 11),
            'end_date': date(2025, 8, 5),
            'permit_required': False
        },
        {
            'name': 'MEP - Electrical & Plumbing', 
            'order': 9, 
            'estimated_budget': 600000, 
            'description': 'Complete electrical wiring, concealed plumbing lines, and installation of bathroom sanitary fixtures.',
            'start_date': date(2025, 8, 6),
            'end_date': date(2025, 8, 25),
            'permit_required': False
        },
        {
            'name': 'Interior & Woodwork', 
            'order': 10, 
            'estimated_budget': 1000000, 
            'description': 'Final wall painting, interior design elements, and woodwork for doors, windows, and modular kitchen cabinets.',
            'start_date': date(2025, 8, 26),
            'end_date': date(2025, 9, 15),
            'permit_required': False
        },
        {
            'name': 'Exterior & Landscaping', 
            'order': 11, 
            'estimated_budget': 350000, 
            'description': 'Building the compound wall, installing the main gate, and setting up the garden and driveway paving.',
            'start_date': date(2025, 9, 16),
            'end_date': date(2025, 9, 30),
            'permit_required': False
        },
        {
            'name': 'Final Handover', 
            'order': 12, 
            'estimated_budget': 200000, 
            'description': 'Performing deep cleaning of the entire premises and doing a final quality inspection before house handover.',
            'start_date': date(2025, 10, 1),
            'end_date': date(2025, 10, 5),
            'permit_required': False
        },
    ]

    for phase_data in phases:
        phase, created = ConstructionPhase.objects.get_or_create(
            name=phase_data['name'],
            defaults={
                'order': phase_data['order'],
                'estimated_budget': phase_data['estimated_budget'],
                'description': phase_data['description'],
                'start_date': phase_data.get('start_date'),
                'end_date': phase_data.get('end_date'),
                'status': 'PENDING'
            }
        )
        if created:
            print(f"Created phase: {phase.name}")
        else:
            phase.order = phase_data['order']
            phase.estimated_budget = phase_data['estimated_budget']
            phase.description = phase_data['description']
            phase.start_date = phase_data.get('start_date')
            phase.end_date = phase_data.get('end_date')
            phase.save()
            print(f"Updated phase: {phase.name}")

if __name__ == '__main__':
    populate()
