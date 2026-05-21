import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.financials.models.budget import BudgetCategory, BudgetAllocation

def run():
    mapping = {
        "Design And Drawing": 1,
        "Levelling and Excavation Works": 3,
        "Foundation Protection and Preparation Works": 4,
        "RCC, Reinforcement and Shuttering Works": 5,
        "Opening Schedule": 17,
        "Walls / Plasters/Painting": 12,
        "Tiles, Marble, Screeding, Punning and Granite": 18,
        "Exterior Design Section": 20,
        "Waterproofing and Special Treatment": 11,
        "Other Items (Tank, Septic, Stairs, etc.)": 20,
        "Electrical Fittings": 14,
        "Sanitary Pipes and Fittings": 15,
        "Management Charge": 20,
    }

    allocations = BudgetAllocation.objects.all()
    updated = 0
    for alloc in allocations:
        cat_name = alloc.category.name.split(" (")[0].strip()
        phase_id = mapping.get(cat_name)
        if phase_id:
            alloc.phase_id = phase_id
            alloc.save()
            updated += 1
            print(f"Moved {cat_name} to Phase ID {phase_id}")
        else:
            print(f"Could not map: {cat_name}")

    print(f"Successfully remapped {updated} allocations.")

run()
