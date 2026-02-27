def populate():
    from apps.resources.models import Contractor
    
    contractors = [
        {'name': 'Shyam Kumar Thapa', 'role': 'THEKEDAAR', 'phone': '9851022222', 'address': 'Koteshwor'},
        {'name': 'Er. Saroj Pandey', 'role': 'ENGINEER', 'phone': '9841033333', 'address': 'Maharajgunj'},
        {'name': 'Hari Bahadur Mistri', 'role': 'MISTRI', 'phone': '9803044444', 'address': 'Chabahil'},
        {'name': 'Kancha Helper', 'role': 'LABOUR', 'phone': '9860055555', 'address': 'Gaudatar'},
        {'name': 'Bijaya Electrician', 'role': 'ELECTRICIAN', 'phone': '9848066666', 'address': 'Dhapasi'},
        {'name': 'Ramesh Plumber', 'role': 'PLUMBER', 'phone': '9855077777', 'address': 'Samakhusi'},
    ]

    for c_data in contractors:
        contractor, created = Contractor.objects.get_or_create(
            name=c_data['name'],
            role=c_data['role'],
            defaults={
                'phone': c_data['phone'],
                'address': c_data['address'],
                'is_active': True
            }
        )
        if created:
            print(f"Created contractor: {contractor.name} ({contractor.role})")

if __name__ == '__main__':
    populate()
