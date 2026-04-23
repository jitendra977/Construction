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

def run():
    # Find Radhika's project
    project = HouseProject.objects.get(id=4)
    if not project:
        print("Project not found")
        return

    # Clear old phases
    deleted_count, _ = ConstructionPhase.objects.filter(project=project).delete()
    print(f"Deleted {deleted_count} old phases.")

    # Data based on the user's prompt
    phases_data = [
        {
            "name": "Section A: Design & Drawing",
            "order": 1,
            "estimated_budget": Decimal("100000"),
            "tasks": [
                {"title": "Municipal Work", "estimated_cost": Decimal("100000")}
            ]
        },
        {
            "name": "Section B: Levelling & Excavation",
            "order": 2,
            "estimated_budget": Decimal("90615.60"),
            "tasks": [
                {"title": "Excavation Works", "estimated_cost": Decimal("43165.20")},
                {"title": "Back Filling", "estimated_cost": Decimal("30205.20")},
                {"title": "Levelling Works", "estimated_cost": Decimal("17245.20")}
            ]
        },
        {
            "name": "Section C: Foundation Works",
            "order": 3,
            "estimated_budget": Decimal("177939.00"),
            "tasks": [
                {"title": "Stone Soiling", "estimated_cost": Decimal("55358.80")},
                {"title": "PCC Work", "estimated_cost": Decimal("122580.20")}
            ]
        },
        {
            "name": "Section D: RCC & Structure",
            "order": 4,
            "estimated_budget": Decimal("4401868.62"),
            "tasks": [
                {"title": "M20 Concrete", "estimated_cost": Decimal("1679047.41")},
                {"title": "Reinforcement", "estimated_cost": Decimal("2132759.13")},
                {"title": "Shuttering", "estimated_cost": Decimal("590062.08")}
            ]
        },
        {
            "name": "Section E: Doors & Windows",
            "order": 5,
            "estimated_budget": Decimal("924379.75"),
            "tasks": [
                {"title": "Main Door", "estimated_cost": Decimal("160000")},
                {"title": "Door Frame", "estimated_cost": Decimal("168000")},
                {"title": "Shutter", "estimated_cost": Decimal("73500")},
                {"title": "Lock & Installation", "estimated_cost": Decimal("42000")},
                {"title": "Windows (UPVC)", "estimated_cost": Decimal("430125")},
                {"title": "Metal Work Window", "estimated_cost": Decimal("50754.75")}
            ]
        },
        {
            "name": "Section F: Wall, Plaster & Paint",
            "order": 6,
            "estimated_budget": Decimal("3479637.05"),
            "tasks": [
                {"title": "Brick Masonry", "estimated_cost": Decimal("1655321.81")},
                {"title": "Plaster Work", "estimated_cost": Decimal("1021787.84")},
                {"title": "Painting", "estimated_cost": Decimal("657259.52")},
                {"title": "Wall Putty", "estimated_cost": Decimal("103527.89")},
                {"title": "Enamel Paint", "estimated_cost": Decimal("41740")}
            ]
        },
        {
            "name": "Section G: Tiles & Finishing",
            "order": 7,
            "estimated_budget": Decimal("901757.33"),
            "tasks": [
                {"title": "Screeding", "estimated_cost": Decimal("157058")},
                {"title": "Granite Work", "estimated_cost": Decimal("90562.83")},
                {"title": "Granite Staircase", "estimated_cost": Decimal("321651.90")},
                {"title": "Floor Tiles", "estimated_cost": Decimal("332484.60")}
            ]
        },
        {
            "name": "Section H: Exterior",
            "order": 8,
            "estimated_budget": Decimal("0"),
            "tasks": [
                {"title": "Parking Tiles", "estimated_cost": Decimal("0")}
            ]
        },
        {
            "name": "Section I: Waterproofing",
            "order": 9,
            "estimated_budget": Decimal("89376.20"),
            "tasks": [
                {"title": "Membrane Sheet", "estimated_cost": Decimal("89376.20")}
            ]
        },
        {
            "name": "Section J: Other Works",
            "order": 10,
            "estimated_budget": Decimal("669132.79"),
            "tasks": [
                {"title": "Water Tank (2 Nos)", "estimated_cost": Decimal("30000")},
                {"title": "Metal Stand", "estimated_cost": Decimal("28000")},
                {"title": "Underground Tank", "estimated_cost": Decimal("109601.04")},
                {"title": "Stair Railing", "estimated_cost": Decimal("96987.50")},
                {"title": "Balcony Railing", "estimated_cost": Decimal("84496.50")},
                {"title": "Metal Staircase", "estimated_cost": Decimal("30000")},
                {"title": "Septic Tank", "estimated_cost": Decimal("125047.75")},
                {"title": "Design Cost", "estimated_cost": Decimal("150000")},
                {"title": "Earthing", "estimated_cost": Decimal("15000")}
            ]
        }
    ]

    total_budget = Decimal(0)
    for pd in phases_data:
        phase = ConstructionPhase.objects.create(
            project=project,
            name=pd["name"],
            order=pd["order"],
            estimated_budget=pd["estimated_budget"],
            status="PENDING"
        )
        total_budget += pd["estimated_budget"]
        for td in pd["tasks"]:
            Task.objects.create(
                phase=phase,
                title=td["title"],
                estimated_cost=td["estimated_cost"],
                status="PENDING"
            )
            
    project.total_budget = total_budget
    project.save()

    print(f"Successfully applied new phases and tasks to '{project.name}'.")
    print(f"Total Budget updated to {total_budget}")

if __name__ == "__main__":
    run()
