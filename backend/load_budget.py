import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings_local")
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.financials.models.budget import BudgetCategory, BudgetAllocation

def run():
    project = HouseProject.objects.first()
    if not project:
        print("No project found.")
        return
        
    phase = ConstructionPhase.objects.filter(project=project).first()
    if not phase:
        phase = ConstructionPhase.objects.create(project=project, name="General Phase", status="IN_PROGRESS")

    # Delete existing categories (will SET_NULL on bills/expenses)
    BudgetCategory.objects.all().delete()

    data = [
        ("Design And Drawing", 75000.00),
        ("Levelling and Excavation Works", 90615.60),
        ("Foundation Protection and Preparation Works", 177939.00),
        ("RCC, Reinforcement and Shuttering Works", 4401868.62),
        ("Opening Schedule", 924379.75),
        ("Walls / Plasters/Painting", 3479637.05),
        ("Tiles, Marble, Screeding, Punning and Granite", 901757.33),
        ("Exterior Design Section", 0.00),
        ("Waterproofing and Special Treatment", 89376.20),
        ("Other Items (Tank, Septic, Stairs, etc.)", 669132.79),
        ("Electrical Fittings", 432388.25),
        ("Sanitary Pipes and Fittings", 586750.00),
        ("Management Charge", 591442.23),
    ]

    for i, (name, amount) in enumerate(data):
        cat = BudgetCategory.objects.create(
            name=name,
            project=project,
            sequence=i
        )
        if amount > 0:
            BudgetAllocation.objects.create(
                category=cat,
                phase=phase,
                allocated_amount=amount,
                notes="Imported from client estimate"
            )
        print(f"Added {name}: {amount}")

    print("Budget loaded successfully.")

run()
