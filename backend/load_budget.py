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

    # 1. Core construction phases including user specified Painting & Finishing + Exterior & Boundary phases
    phases_data = [
        ("Phase 1: Preliminary & Site Setup", 1, "Initial planning, engineering, mapping and site prep"),
        ("Phase 2: Substructure & Foundation", 2, "Foundation, footing and plinth level works up to DPC"),
        ("Phase 3: Superstructure Frame", 3, "Pillar, beam casting and concrete slabs (ढलान)"),
        ("Phase 4: Brickwork, Plaster & Openings", 4, "Brick masonry, plaster and door/window frame fitting"),
        ("Phase 5: Services (MEP & Utilities)", 5, "Electrical, plumbing, sanitary lines and waterproofing"),
        ("Phase 6: Finishing & Masonry", 6, "Tiles, marble, screeding and punning"),
        ("Phase 7: Painting तथा Finishing", 7, "Painting, internal door fittings and final finishing works"),
        ("Phase 8: Exterior तथा Boundary", 8, "Exterior boundary wall, water tanks, balconies and railings"),
    ]

    phases_by_order = {}
    for name, order, desc in phases_data:
        phase, created = ConstructionPhase.objects.get_or_create(
            project=project,
            order=order,
            defaults={"name": name, "status": "PENDING", "description": desc}
        )
        phase.name = name
        phase.description = desc
        phase.save()
        phases_by_order[order] = phase
        print(f"Ensured Phase {order}: {name}")

    # Set first phase as in_progress to make it realistic
    p1 = phases_by_order[1]
    p1.status = "IN_PROGRESS"
    p1.save()

    # 2. Delete existing categories
    BudgetCategory.objects.all().delete()

    # 3. Comprehensive Categories list including original seeded + 18 new user-specified categories
    categories_distribution = [
        # Original categories
        ("Design And Drawing", 1, 75000.00),
        ("Levelling and Excavation Works", 1, 90615.60),
        ("Foundation Protection and Preparation Works", 2, 177939.00),
        ("RCC, Reinforcement and Shuttering Works", 3, 4401868.62),
        ("Opening Schedule", 4, 924379.75),
        ("Walls / Plasters/Painting (Brickwork)", 4, 2500000.00),
        ("Sanitary Pipes and Fittings", 5, 586750.00),
        ("Waterproofing and Special Treatment", 5, 89376.20),
        ("Electrical Fittings", 5, 432388.25),
        ("Tiles, Marble, Screeding, Punning and Granite", 6, 901757.33),
        ("Exterior Design Section", 7, 0.00),
        ("Walls / Plasters/Painting (Painting)", 7, 979637.05),
        ("Management Charge", 8, 591442.23),

        # User new categories: Doors, Windows & Metal Works (Painting तथा Finishing - Order 7)
        ("Main Entrance Door 1 (मुख्य प्रवेश ढोका नं. १)", 7, 45000.00),
        ("Main Entrance Door 2 (मुख्य प्रवेश ढोका नं. २)", 7, 45000.00),
        ("Main Entrance Door 3 & 4 (मुख्य प्रवेश ढोका नं. ३ र ४)", 7, 85000.00),
        ("Main Door Lock & Handle Set (मुख्य ढोका लक तथा ह्यान्डल सेट)", 7, 12000.00),
        ("Internal Wooden Door Frame 3”x4” (भित्री काठको चौखट ३”x४”)", 7, 65000.00),
        ("Internal Ready-Made Door Shutter (रेडिमेड भित्री ढोका सटर)", 7, 75000.00),
        ("Internal Door Lock & Hardware Set (भित्री ढोका लक तथा हार्डवेयर सेट)", 7, 18000.00),
        ("UPVC Window System (UPVC झ्याल प्रणाली)", 7, 120000.00),

        # User new categories: Doors, Windows & Metal Works (Exterior तथा Boundary - Order 8)
        ("Ground Floor Window Metal Grill (भुईँतला झ्याल मेटल ग्रिल)", 8, 35000.00),

        # User new categories: Water Tank & Utility (Exterior तथा Boundary - Order 8)
        ("Underground Water Tank 8000L (8000 लिटर भूमिगत पानी ट्याङ्की)", 8, 150000.00),
        ("Overhead Water Tank 1000L (1000 लिटर ओभरहेड पानी ट्याङ्की)", 8, 25000.00),
        ("Overhead Water Tank Metal Stand (ओभरहेड पानी ट्याङ्की मेटल स्ट्यान्ड)", 8, 15000.00),
        ("Water Tank Service Platform Stand (पानी ट्याङ्की सर्भिस प्लेटफर्म स्ट्यान्ड)", 8, 20000.00),
        ("Metal Access Staircase to Water Tank Floor (पानी ट्याङ्की पहुँच मेटल सिँढी)", 8, 30000.00),

        # User new categories: Railings (Painting तथा Finishing - Order 7)
        ("Internal SS Stair Railing (भित्री SS सिँढी रेलिङ)", 7, 55000.00),

        # User new categories: Railings (Exterior तथा Boundary - Order 8)
        ("Balcony Glass Railing System (बाल्कोनी ग्लास रेलिङ सिस्टम)", 8, 80000.00),
        ("Terrace Glass Railing System (टेरेस ग्लास रेलिङ सिस्टम)", 8, 90000.00),
        ("Toughened Glass Railing (टफेन्ड ग्लास रेलिङ)", 8, 60000.00),
    ]

    for i, (name, phase_order, amount) in enumerate(categories_distribution):
        cat = BudgetCategory.objects.create(
            name=name,
            project=project,
            sequence=i
        )
        target_phase = phases_by_order[phase_order]
        if amount > 0:
            BudgetAllocation.objects.create(
                category=cat,
                phase=target_phase,
                allocated_amount=amount,
                notes=f"Initial allocation for {target_phase.name}"
            )
        print(f"Added {name} mapped to Phase {phase_order} (Amount: Rs.{amount})")

    print("✅ Budget and Phase mappings seeded successfully with new raw data.")

if __name__ == "__main__":
    run()
