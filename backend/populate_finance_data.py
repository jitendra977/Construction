import os
import django
import sys
import random
from decimal import Decimal
from datetime import date, timedelta

# Setup Django environment
sys.path.append('.')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.finance.models import BudgetCategory, FundingSource, Expense, Payment, FundingTransaction
from apps.resources.models import Material, Supplier, MaterialTransaction, Contractor
from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
from django.utils import timezone

def populate_data():
    print("--- Populating PROFESSIONAL Nepali Home construction Data (~1.5 Crore Budget) ---")
    
    # 1. Clear ALL existing data
    Payment.objects.all().delete()
    FundingTransaction.objects.all().delete()
    MaterialTransaction.objects.all().delete()
    Expense.objects.all().delete()
    BudgetCategory.objects.all().delete()
    FundingSource.objects.all().delete()
    Material.objects.all().delete()
    Supplier.objects.all().delete()
    Contractor.objects.all().delete()
    ConstructionPhase.objects.all().delete()
    Floor.objects.all().delete()
    HouseProject.objects.all().delete()
    print("Cleared all existing database records.")

    # 1.5 Project Setup
    project = HouseProject.objects.create(
        name="Adarsha Niwas (आदर्श निवास)",
        owner_name="Jitendra Khadka",
        address="Budhanilkantha, Kathmandu",
        total_budget=Decimal("15000000.00"),
        start_date=date(2025, 12, 1),
        expected_completion_date=date(2027, 6, 30),
        area_sqft=2400
    )

    # 1.6 Professional Phases (Nepali Standards)
    phases_list = [
        {"name": "Land Prep & Excavation (जग खन्ने)", "order": 1, "status": "COMPLETED", "estimated_budget": Decimal("800000.00")},
        {"name": "Foundation & DPC (जग र डी.पी.सी)", "order": 2, "status": "COMPLETED", "estimated_budget": Decimal("1500000.00")},
        {"name": "Ground Floor Pillars (पिलर ठड्याउने)", "order": 3, "status": "IN_PROGRESS", "estimated_budget": Decimal("1200000.00")},
        {"name": "Brickwork & Lintel (गारो र लिन्टेल)", "order": 4, "status": "PENDING", "estimated_budget": Decimal("1000000.00")},
        {"name": "First Floor Slab (ढलान)", "order": 5, "status": "PENDING", "estimated_budget": Decimal("1800000.00")},
        {"name": "Plaster & Finishing (प्लास्टर र फिनिसिङ)", "order": 6, "status": "PENDING", "estimated_budget": Decimal("4000000.00")},
    ]
    phases = [ConstructionPhase.objects.create(**p) for p in phases_list]

    # 1.7 Floors & Rooms
    floors_list = [
        {"name": "Ground Floor (भुइँ तल्ला)", "level": 0},
        {"name": "First Floor (पहिलो तल्ला)", "level": 1},
        {"name": "Second Floor / Roof (दोस्रो तल्ला)", "level": 2},
    ]
    floors = {f["name"]: Floor.objects.create(**f) for f in floors_list}

    rooms_list = [
        {"name": "Baithak (Sitting Room)", "floor": floors["Ground Floor (भुइँ तल्ला)"], "status": "IN_PROGRESS"},
        {"name": "Kitchen (भान्छा)", "floor": floors["Ground Floor (भुइँ तल्ला)"], "status": "NOT_STARTED"},
        {"name": "Master Bed", "floor": floors["First Floor (पहिलो तल्ला)"], "status": "NOT_STARTED"},
    ]
    for r in rooms_list:
        Room.objects.create(**r)

    # 2. Professional Categories (Nepali Standards)
    categories_list = [
        {"name": "Civil Works & Structure (जग र संरचना)", "allocation": Decimal("7500000.00"), "description": "Foundation, Pillars, Beams, Slabs, Bricks, Cement, Sand, Aggregates"},
        {"name": "Finishing & Interior (फिनिसिङ)", "allocation": Decimal("4000000.00"), "description": "Tiles, Marble, Asian Paints, Woodwork, UPVC, Putty"},
        {"name": "MEP: Electrical & Plumbing (बिजुली र प्लम्बिङ)", "allocation": Decimal("1500000.00"), "description": "Wiring, PPR/CPVC Piping, Sanitary items"},
        {"name": "Labor & Wages (ज्यामी र मिस्त्री खर्च)", "allocation": Decimal("1500000.00"), "description": "Mistry and Labor wages for all phases"},
        {"name": "Consulting & Permits (नक्सा र अनुमति)", "allocation": Decimal("500000.00"), "description": "Map approval, Engineering fees, Structural audit"},
    ]
    categories = {c["name"]: BudgetCategory.objects.create(**c) for c in categories_list}

    # 3. Suppliers
    suppliers_list = [
        {"name": "Sherpa Material Suppliers (शेर्पा निर्माण सामग्री)", "phone": "9851000000", "category": "Civil", "address": "Bouddha"},
        {"name": "Panchakanya Steel Center (पञ्चकन्या स्टिल)", "phone": "9801000000", "category": "Steel", "address": "Teku"},
        {"name": "Shine Electricals (शाइन इलेक्ट्रिकल्स)", "phone": "9841000000", "category": "Electrical", "address": "Putalisadak"},
        {"name": "Mangalam Hygiene (मङ्गलम हाइजिन)", "phone": "9812000000", "category": "Plumbing", "address": "Balkhu"},
        {"name": "Om Brick Udhyog (ओम इँटा उद्योग)", "phone": "9851234567", "category": "Bricks", "address": "Bhaktapur"},
        {"name": "National Marble & Granite", "phone": "9811223344", "category": "Finishing", "address": "Kalanki"},
    ]
    suppliers = {s["name"]: Supplier.objects.create(**s) for s in suppliers_list}

    # 4. Contractors
    contractors_list = [
        {"name": "Ram Bahadur (Master Mistry)", "phone": "9812345678", "role": "MISTRI", "skills": "Masonry, Structure"},
        {"name": "Krishna & Sons Plumbing", "phone": "9808887776", "role": "PLUMBER", "skills": "PPR/CPVC"},
    ]
    contractors = {c["name"]: Contractor.objects.create(**c) for c in contractors_list}

    # 5. Materials
    materials_list = [
        {"name": "OPC Cement (Arghakhanchi/अर्घाखाँची)", "unit": "BORA", "category": "Civil", "quantity_estimated": 1500, "min_stock_level": 50, "budget_category": categories["Civil Works & Structure (जग र संरचना)"]},
        {"name": "TMT Rebar (Panchakanya/पञ्चकन्या)", "unit": "KG", "category": "Steel", "quantity_estimated": 10000, "min_stock_level": 500, "budget_category": categories["Civil Works & Structure (जग र संरचना)"]},
        {"name": "Bricks (नम्बर १ इँटा)", "unit": "PCS", "category": "Civil", "quantity_estimated": 50000, "min_stock_level": 5000, "budget_category": categories["Civil Works & Structure (जग र संरचना)"]},
        {"name": "PPR Pipe (20mm Mangalam)", "unit": "PCS", "category": "Plumbing", "quantity_estimated": 200, "min_stock_level": 20, "budget_category": categories["MEP: Electrical & Plumbing (बिजुली र प्लम्बिङ)"]},
    ]
    materials = {m["name"]: Material.objects.create(**m) for m in materials_list}

    # 6. Funding (1.5 Cr Total)
    funding_list = [
        {"name": "Nabil Bank Home Loan (नबिल बैंक)", "source_type": "LOAN", "amount": Decimal("10000000.00"), "received_date": date(2026, 1, 1), "default_payment_method": "BANK_TRANSFER"},
        {"name": "Personal Savings (व्यक्तिगत बचत)", "source_type": "OWN_MONEY", "amount": Decimal("5000000.00"), "received_date": date(2025, 12, 1), "default_payment_method": "CASH"},
    ]
    f_sources = {f["name"]: FundingSource.objects.create(**f) for f in funding_list}

    # 7. Realistic Large Transactions
    today = date.today()
    
    # Large Purchases
    purchases = [
        (materials["OPC Cement (Arghakhanchi/अर्घाखाँची)"], 1000, Decimal("780"), suppliers["Sherpa Material Suppliers (शेर्पा निर्माण सामग्री)"], f_sources["Nabil Bank Home Loan (नबिल बैंक)"], "Foundation & Pillars Bulk Order"),
        (materials["TMT Rebar (Panchakanya/पञ्चकन्या)"], 8000, Decimal("105"), suppliers["Panchakanya Steel Center (पञ्चकन्या स्टिल)"], f_sources["Nabil Bank Home Loan (नबिल बैंक)"], "Structural Steel - All Floors"),
        (materials["Bricks (नम्बर १ इँटा)"], 30000, Decimal("18.5"), suppliers["Om Brick Udhyog (ओम इँटा उद्योग)"], f_sources["Personal Savings (व्यक्तिगत बचत)"], "Main Structure Bricks"),
    ]

    for mat, qty, price, sup, fund, note in purchases:
        t = MaterialTransaction.objects.create(
            material=mat, transaction_type='IN', quantity=qty, unit_price=price,
            date=today - timedelta(days=25), supplier=sup, funding_source=fund,
            purpose="Phase 1 Structure", notes=note
        )
        if t.expense:
            Payment.objects.create(expense=t.expense, amount=t.expense.amount, date=t.date, 
                                 method=fund.default_payment_method, reference_id=f"IPS-{random.randint(1000,9999)}")

    # Specific Labor/Fees
    labor = [
        ("Master Mistry: Contract Installment 1", Decimal("250000.00"), contractors["Ram Bahadur (Master Mistry)"], f_sources["Nabil Bank Home Loan (नबिल बैंक)"], "Slab Casting Fee"),
        ("Municipal Map Approval Fees", Decimal("180000.00"), None, f_sources["Personal Savings (व्यक्तिगत बचत)"], "Government/Ward Charges"),
    ]

    for title, amt, cont, fund, purpose in labor:
        exp = Expense.objects.create(
            title=title, amount=amt, expense_type='LABOR' if cont else 'FEES', 
            category=categories["Labor & Wages (ज्यामी र मिस्त्री खर्च)"] if cont else categories["Consulting & Permits (नक्सा र अनुमति)"],
            contractor=cont, funding_source=fund, date=today - timedelta(days=15),
            paid_to=cont.name if cont else "Kathmandu Metropolitan City", is_paid=True
        )
        Payment.objects.create(expense=exp, amount=amt, date=exp.date, method=fund.default_payment_method, reference_id="REF-FIN")

    # Some Usage
    usage = [
        (materials["OPC Cement (Arghakhanchi/अर्घाखाँची)"], 600, "First Floor Casting"),
        (materials["TMT Rebar (Panchakanya/पञ्चकन्या)"], 5000, "Structural Binding"),
    ]
    for mat, qty, purpose in usage:
        MaterialTransaction.objects.create(
            material=mat, transaction_type='OUT', quantity=qty, 
            date=today - timedelta(days=5), purpose=purpose, notes="Usage verified by supervisor"
        )

    print(f"--- Population Complete. Professional Nepali construction data active. ---")

if __name__ == "__main__":
    populate_data()
