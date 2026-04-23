"""
Management command to seed Mrs. Radhika K.C. Khadka's construction project.

Contract details (from Skill Sewa agreement, 2082/12/23 BS):
  - Client  : Mrs. Radhika K.C. Khadka, Tulsipur, Dang
  - Contractor: Skill Sewa / Rajendra Chaudhary
  - Total   : NPR 12,420,286.82
  - Structure: 3-storey RC-SMRF Residential Building
  - Start   : 2083/01/29 BS  (~2026-05-12 AD)
  - End     : 2084/01/29 BS  (~2027-05-12 AD)

Payment milestones (11 installments):
  1  Advance                 15%   1,863,043.02
  2  Footing                 10%   1,242,028.68
  3  DPC                     10%   1,242,028.68
  4  Ground Floor Wall       10%   1,242,028.68
  5  Ground Floor Slab       10%   1,242,028.68
  6  First Floor Wall        10%   1,242,028.68
  7  First Floor Slab        10%   1,242,028.68
  8  Second Floor Wall        8%     993,622.95
  9  Second Floor Slab        8%     993,622.95
  10 Other / Finishing        9%   1,117,825.81
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date
from decimal import Decimal

from apps.core.models import HouseProject, ConstructionPhase


PHASES = [
    # (name, order, estimated_budget, status, description)
    ("Advance Payment",         1,  Decimal("1863043.02"), "COMPLETED",   "15% advance per contract terms"),
    ("Footing / Jag Khanne",    2,  Decimal("1242028.68"), "IN_PROGRESS", "Foundation footings – 10% milestone"),
    ("DPC",                     3,  Decimal("1242028.68"), "PENDING",     "Damp Proof Course – 10% milestone"),
    ("Ground Floor Wall",       4,  Decimal("1242028.68"), "PENDING",     "GF masonry walls – 10% milestone"),
    ("Ground Floor Slab",       5,  Decimal("1242028.68"), "PENDING",     "GF slab casting – 10% milestone"),
    ("First Floor Wall",        6,  Decimal("1242028.68"), "PENDING",     "1F masonry walls – 10% milestone"),
    ("First Floor Slab",        7,  Decimal("1242028.68"), "PENDING",     "1F slab casting – 10% milestone"),
    ("Second Floor Wall",       8,  Decimal("993622.95"),  "PENDING",     "2F masonry walls – 8% milestone"),
    ("Second Floor Slab",       9,  Decimal("993622.95"),  "PENDING",     "2F slab casting – 8% milestone"),
    ("Finishing & Remaining",   10, Decimal("1117825.81"), "PENDING",     "Final finishing works – 9% milestone"),
]


class Command(BaseCommand):
    help = "Seed Mrs. Radhika K.C. Khadka construction project from contract data"

    def add_arguments(self, parser):
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Delete existing Radhika project before re-seeding',
        )

    def handle(self, *args, **options):
        if options['reset']:
            deleted, _ = HouseProject.objects.filter(
                owner_name__icontains="Radhika"
            ).delete()
            self.stdout.write(self.style.WARNING(f"Deleted existing Radhika project (rows: {deleted})"))

        project, created = HouseProject.objects.get_or_create(
            owner_name="Mrs. Radhika K.C. Khadka",
            defaults={
                "name": "Radhika Mam - Tulsipur Residential",
                "address": "Tulsipur Sub-Metropolitancity, Dang",
                "total_budget": Decimal("12420286.82"),
                "start_date": date(2026, 5, 12),          # 2083/01/29 BS
                "expected_completion_date": date(2027, 5, 12),  # 2084/01/29 BS
                "area_sqft": 2400,                        # 3-storey SMRF residential estimate
            }
        )

        action = "Created" if created else "Already exists"
        self.stdout.write(self.style.SUCCESS(
            f"{action}: {project.name} (id={project.pk})"
        ))

        # Seed phases
        phase_count = 0
        for name, order, budget, status, desc in PHASES:
            phase, ph_created = ConstructionPhase.objects.get_or_create(
                project=project,
                name=name,
                defaults={
                    "order": order,
                    "estimated_budget": budget,
                    "status": status,
                    "description": desc,
                    "permit_required": False,
                    "permit_status": "NOT_REQUIRED",
                }
            )
            if not ph_created:
                # Update budget in case it was already seeded but wrong
                phase.estimated_budget = budget
                phase.order = order
                phase.description = desc
                phase.save()

            verb = "Created" if ph_created else "Updated"
            self.stdout.write(f"  {verb} phase: {phase.name} (NPR {budget:,.2f})")
            phase_count += 1

        total = sum(p[2] for p in PHASES)
        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Project ID={project.pk} | {phase_count} phases | Total: NPR {total:,.2f}"
        ))
