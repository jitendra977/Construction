from datetime import date

def populate():
    from apps.permits.models import PermitStep
    
    steps = [
        {'title': 'Nagar Palika Darta (Registration)', 'order': 1, 'status': 'APPROVED', 'date': date(2024, 11, 1)},
        {'title': 'Sthayi Naksa Pass (Permanent Blueprint Approval)', 'order': 2, 'status': 'APPROVED', 'date': date(2024, 12, 15)},
        {'title': 'Plinth Level Inspection', 'order': 3, 'status': 'PENDING', 'date': None},
        {'title': 'Superstructure Inspection', 'order': 4, 'status': 'PENDING', 'date': None},
        {'title': 'Sampanna Pramanpatra (Completion Certificate)', 'order': 5, 'status': 'PENDING', 'date': None},
    ]

    for s_data in steps:
        step, created = PermitStep.objects.get_or_create(
            title=s_data['title'],
            defaults={
                'status': s_data['status'],
                'order': s_data['order'],
                'date_issued': s_data['date']
            }
        )
        if created:
            print(f"Created permit step: {step.title}")

if __name__ == '__main__':
    populate()
