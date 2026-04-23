import os, sys, django
from decimal import Decimal
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.accounting.models.budget import PhaseBudgetLine
from apps.accounting.models.payables import Vendor
from apps.accounting.models.construction import ContractorPaymentRequest

# Budget allocations in NPR per phase (realistic construction costs)
PHASE_BUDGETS = {
    'Naksa / Design (नक्सा)':              150000,
    'Municipal Approval (नक्सा पास)':      80000,
    'Jag Khanne (जग खन्ने)':              200000,
    'Foundation / DPC':                    400000,
    'Pillar & Beam – Ground Floor':        600000,
    'Brick Wall – Ground Floor':           300000,
    'Pillar & Beam – First Floor':         600000,
    'Brick Wall – First Floor':            300000,
    'Pillar & Beam – Second Floor':        600000,
    'Brick Wall – Second Floor':           300000,
    'Roof / Chhana (छाना)':               500000,
    'Plaster / Dhuwai (ढुवाई)':            350000,
    'Electrical Wiring (बिजुली)':            200000,
    'Plumbing / Sanitary (प्लम्बिङ)':       200000,
    'Painting (रंगरोगन)':                   200000,
    'Doors & Windows (ढोका/झ्याल)':       450000,
    'Tile / Flooring (टाइल)':               400000,
    'Railing / Boundary Wall':             300000,
    'Finishing & Handover':                100000,
}

def seed():
    project = HouseProject.objects.filter(name__icontains='Jitu').first()
    if not project:
        print("❌ Project not found. Run seed_accounting.py first.")
        return

    print(f"Seeding budgets for project: {project.name}")
    # ConstructionPhase doesn't have a project field, it seems to be global or linked differently.
    # We will just iterate over all phases and create budgets for this project.
    phases = ConstructionPhase.objects.all().order_by('order')
    
    created_count = 0
    for phase in phases:
        # Find matching budget from our map (fuzzy match on name)
        budget_amount = None
        for key, amount in PHASE_BUDGETS.items():
            if key.lower()[:10] in phase.name.lower() or phase.name.lower()[:10] in key.lower():
                budget_amount = amount
                break
        if budget_amount is None:
            budget_amount = 100000  # Default 1 Lakh for unmatched phases

        _, created = PhaseBudgetLine.objects.get_or_create(
            project=project,
            phase=phase,
            defaults={'budgeted_amount': Decimal(str(budget_amount))}
        )
        status = "✅ Created" if created else "⏭  Exists"
        print(f"  {status}: {phase.name} → Rs. {budget_amount:,}")
        if created:
            created_count += 1

    # Seed a sample vendor and contractor payment request
    vendor, _ = Vendor.objects.get_or_create(
        name="Ram Bahadur Construction Pvt. Ltd.",
        defaults={"phone": "9841000001"}
    )
    print(f"\n{'✅ Created' if _ else '⏭  Exists'} Vendor: {vendor.name}")

    foundation_phase = phases.filter(name__icontains='Foundation').first()
    if foundation_phase:
        pr, created = ContractorPaymentRequest.objects.get_or_create(
            project=project,
            phase=foundation_phase,
            contractor=vendor,
            defaults={
                'description': 'Foundation work completed up to DPC level',
                'work_completion_percentage': Decimal('75.00'),
                'claimed_amount': Decimal('300000.00'),
                'retention_amount': Decimal('15000.00'),
                'net_payable': Decimal('285000.00'),
                'status': 'PENDING',
            }
        )
        print(f"{'✅ Created' if created else '⏭  Exists'} Payment Request: Foundation 75%")

    print(f"\n🎉 Done! {created_count} new budget lines created.")

if __name__ == "__main__":
    seed()
