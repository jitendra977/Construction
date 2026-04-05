from datetime import date

def populate():
    from apps.core.models import HouseProject
    
    project, created = HouseProject.objects.get_or_create(
        id=1,
        defaults={
            'name': 'Sharma Niwas - 1 Crore Project',
            'owner_name': 'Ram Prasad Sharma',
            'address': 'Budhanilkantha-04, Kathmandu, Nepal',
            'total_budget': 10000000.00,  # 1 Crore
            'start_date': date(2025, 1, 15),
            'expected_completion_date': date(2026, 6, 30),
            'area_sqft': 1800  # Scaled down area for 1 Crore budget
        }
    )
    
    if created:
        print(f"Created house project: {project.name}")
    else:
        # Update existing
        project.name = 'Sharma Niwas - 1 Crore Project'
        project.owner_name = 'Ram Prasad Sharma'
        project.address = 'Budhanilkantha-04, Kathmandu, Nepal'
        project.total_budget = 10000000.00
        project.start_date = date(2025, 1, 15)
        project.expected_completion_date = date(2026, 6, 30)
        project.area_sqft = 1800
        project.save()
        print(f"Updated house project: {project.name}")

if __name__ == '__main__':
    populate()
