def populate():
    from apps.core.models import Floor, Room
    
    floors = [
        {'name': 'Ground Floor', 'level': 0, 'rooms': [
            {'name': 'Baithak Kotha (Living Room)', 'area': 250, 'status': 'NOT_STARTED', 'budget': 150000},
            {'name': 'Bhansa (Kitchen)', 'area': 180, 'status': 'NOT_STARTED', 'budget': 350000},
            {'name': 'Bhojan Kotha (Dining)', 'area': 150, 'status': 'NOT_STARTED', 'budget': 100000},
            {'name': 'Common Toilet', 'area': 50, 'status': 'NOT_STARTED', 'budget': 80000},
            {'name': 'Guest Bedroom', 'area': 140, 'status': 'NOT_STARTED', 'budget': 120000},
        ]},
        {'name': 'First Floor', 'level': 1, 'rooms': [
            {'name': 'Master Bedroom', 'area': 280, 'status': 'NOT_STARTED', 'budget': 450000},
            {'name': 'Kids Bedroom', 'area': 160, 'status': 'NOT_STARTED', 'budget': 200000},
            {'name': 'Family Lounge', 'area': 200, 'status': 'NOT_STARTED', 'budget': 150000},
            {'name': 'Attached Toilet 1', 'area': 60, 'status': 'NOT_STARTED', 'budget': 120000},
            {'name': 'Attached Toilet 2', 'area': 60, 'status': 'NOT_STARTED', 'budget': 120000},
        ]},
        {'name': 'Top Floor', 'level': 2, 'rooms': [
            {'name': 'Puja Kotha', 'area': 80, 'status': 'NOT_STARTED', 'budget': 100000},
            {'name': 'Laundry Room', 'area': 60, 'status': 'NOT_STARTED', 'budget': 50000},
            {'name': 'Roof Terrace', 'area': 400, 'status': 'NOT_STARTED', 'budget': 200000},
        ]},
    ]

    for floor_data in floors:
        floor, created = Floor.objects.get_or_create(
            name=floor_data['name'],
            defaults={'level': floor_data['level']}
        )
        if created:
            print(f"Created floor: {floor.name}")
        
        for room_data in floor_data['rooms']:
            room, r_created = Room.objects.get_or_create(
                name=room_data['name'],
                floor=floor,
                defaults={
                    'area_sqft': room_data['area'],
                    'status': room_data['status'],
                    'budget_allocation': room_data['budget']
                }
            )
            if r_created:
                print(f"  Created room: {room.name}")

if __name__ == '__main__':
    populate()
