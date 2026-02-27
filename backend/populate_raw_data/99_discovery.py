def populate():
    from apps.finance.models import FundingSource
    from apps.core.models import HouseProject
    
    print("--- Discovery ---")
    projects = HouseProject.objects.all()
    print(f"Projects count: {projects.count()}")
    for p in projects:
        print(f"Project ID: {p.id}, Name: {p.name}")
        
    sources = FundingSource.objects.all()
    print(f"FundingSource count: {sources.count()}")
    for s in sources:
        print(f"ID: {s.id}, Name: {s.name}, Amount: {s.amount}, Type: {s.source_type}")
    print("--- End Discovery ---")

if __name__ == '__main__':
    populate()
