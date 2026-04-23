import os
import django
import sys
from decimal import Decimal

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.tasks.models import Task
from apps.finance.models import BudgetCategory, PhaseBudgetAllocation

def run():
    # Find Radhika's project
    project = HouseProject.objects.get(id=4)
    if not project:
        print("Project not found")
        return

    # Data based on the user's prompt
    sections_data = [
        {
            "name": "Section A: Design And Drawing",
            "order": 1,
            "estimated_budget": Decimal("75000"),
            "tasks": [
                {"title": "Municipal Work", "estimated_cost": Decimal("75000")}
            ]
        },
        {
            "name": "Section B: Levelling and Excavation Works",
            "order": 2,
            "estimated_budget": Decimal("90615.60"),
            "tasks": [
                {"title": "Excavation works", "estimated_cost": Decimal("43165.20")},
                {"title": "Back Fill In Excavated Area", "estimated_cost": Decimal("30205.20")},
                {"title": "Levelling Works", "estimated_cost": Decimal("17245.20")}
            ]
        },
        {
            "name": "Section C: Foundation Protection and Preparation Works",
            "order": 3,
            "estimated_budget": Decimal("177939.00"),
            "tasks": [
                {"title": "Stone Soiling in Footing and GF Level", "estimated_cost": Decimal("55358.80")},
                {"title": "PCC Works in Footing and GF Level", "estimated_cost": Decimal("122580.20")}
            ]
        },
        {
            "name": "Section D: RCC, Reinforcement and Shuttering Works",
            "order": 4,
            "estimated_budget": Decimal("4401868.62"),
            "tasks": [
                {"title": "M20 concrete", "estimated_cost": Decimal("1679047.41")},
                {"title": "Reinforcement", "estimated_cost": Decimal("2132759.13")},
                {"title": "Shuttering Works", "estimated_cost": Decimal("590062.08")}
            ]
        },
        {
            "name": "Section E: Opening Schedule",
            "order": 5,
            "estimated_budget": Decimal("924379.75"),
            "tasks": [
                {"title": "Main Door 1", "estimated_cost": Decimal("160000")},
                {"title": "Internal Doors Frame", "estimated_cost": Decimal("168000")},
                {"title": "Internal Doors Shutter", "estimated_cost": Decimal("73500")},
                {"title": "Internal Doors Lock", "estimated_cost": Decimal("42000")},
                {"title": "Windows (UPVC)", "estimated_cost": Decimal("430125")},
                {"title": "Metal Work in Window Ground Floor", "estimated_cost": Decimal("50754.75")}
            ]
        },
        {
            "name": "Section F: Walls / Plasters/Painting",
            "order": 6,
            "estimated_budget": Decimal("3479637.05"),
            "tasks": [
                {"title": "Brick Masonary", "estimated_cost": Decimal("1655321.81")},
                {"title": "Plaster Works", "estimated_cost": Decimal("1021787.84")},
                {"title": "Painting Works", "estimated_cost": Decimal("657259.52")},
                {"title": "Internal Wall Putting", "estimated_cost": Decimal("103527.89")},
                {"title": "Enamel Paint in Door and Metal Work", "estimated_cost": Decimal("41740")}
            ]
        },
        {
            "name": "Section G: Tiles ,Marble,Screeding ,Punning and Granite",
            "order": 7,
            "estimated_budget": Decimal("901757.33"),
            "tasks": [
                {"title": "Screeding", "estimated_cost": Decimal("157058")},
                {"title": "Granite Work", "estimated_cost": Decimal("90562.83")},
                {"title": "Granite work in Staircase", "estimated_cost": Decimal("321651.90")},
                {"title": "Tile in living, Kitchen, Office", "estimated_cost": Decimal("332484.60")}
            ]
        },
        {
            "name": "Section H: Exterior Design Section",
            "order": 8,
            "estimated_budget": Decimal("0"),
            "tasks": [
                {"title": "Parking Tile work", "estimated_cost": Decimal("0")}
            ]
        },
        {
            "name": "Section I: Skill Special treatment and waterproofing works",
            "order": 9,
            "estimated_budget": Decimal("89376.20"),
            "tasks": [
                {"title": "Membrane Sheet layering", "estimated_cost": Decimal("89376.20")}
            ]
        },
        {
            "name": "Section J: Others Items",
            "order": 10,
            "estimated_budget": Decimal("669132.79"),
            "tasks": [
                {"title": "Tank 1000 Ltr-2 Nos", "estimated_cost": Decimal("30000")},
                {"title": "Metal Stand", "estimated_cost": Decimal("28000")},
                {"title": "Underground Water tank", "estimated_cost": Decimal("109601.04")},
                {"title": "Railling (Stairs) SS Steel", "estimated_cost": Decimal("96987.50")},
                {"title": "Railing Balconey (Toughned Glass)", "estimated_cost": Decimal("84496.50")},
                {"title": "Metal Staircase", "estimated_cost": Decimal("30000")},
                {"title": "Septic Tank and Soak Pit", "estimated_cost": Decimal("125047.75")},
                {"title": "Design Cost", "estimated_cost": Decimal("150000")},
                {"title": "Earthing", "estimated_cost": Decimal("15000")}
            ]
        },
        {
            "name": "Electrical fittings",
            "order": 11,
            "estimated_budget": Decimal("432388.25"),
            "tasks": [
                {"title": "Electrical fittings", "estimated_cost": Decimal("432388.25")}
            ]
        },
        {
            "name": "Sanitary pipes and fittings",
            "order": 12,
            "estimated_budget": Decimal("586750.00"),
            "tasks": [
                {"title": "Sanitary pipes and fittings", "estimated_cost": Decimal("586750.00")}
            ]
        },
        {
            "name": "Management Charge",
            "order": 13,
            "estimated_budget": Decimal("591442.23"),
            "tasks": [
                {"title": "Management Charge", "estimated_cost": Decimal("591442.23")}
            ]
        }
    ]

    total_budget = Decimal("12420286.82")

    # Clear old phases and categories
    ConstructionPhase.objects.filter(project=project).delete()
    BudgetCategory.objects.all().delete()

    for pd in sections_data:
        # Create Phase
        phase = ConstructionPhase.objects.create(
            project=project,
            name=pd["name"],
            order=pd["order"],
            estimated_budget=pd["estimated_budget"],
            status="PENDING"
        )
        
        # Create Budget Category
        category = BudgetCategory.objects.create(
            name=pd["name"],
            allocation=pd["estimated_budget"]
        )

        # Allocate Phase to Category (1:1 mapping in this case)
        PhaseBudgetAllocation.objects.create(
            category=category,
            phase=phase,
            amount=pd["estimated_budget"]
        )

        # Create Tasks
        for td in pd["tasks"]:
            Task.objects.create(
                phase=phase,
                category=category,
                title=td["title"],
                estimated_cost=td["estimated_cost"],
                status="PENDING"
            )
            
    project.total_budget = total_budget
    project.save()

    print(f"Successfully applied full budget to '{project.name}'.")
    print(f"Total Budget updated to {total_budget}")

if __name__ == "__main__":
    run()
