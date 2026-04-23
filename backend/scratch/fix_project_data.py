"""
Fix existing DB: assign banks to projects, seed missing data.
Run: python scratch/fix_project_data.py
"""
import os, sys, django
from decimal import Decimal
import datetime, random

sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.accounting.models.ledger import Account, AccountType, EntryType
from apps.accounting.models.treasury import BankAccount
from apps.accounting.models.payables import Vendor, VendorBill, BillPayment
from apps.accounting.models.budget import PhaseBudgetLine
from apps.accounting.services.payables import PayableService
from apps.accounting.services.ledger import LedgerService

# ─── 1. Get Projects ─────────────────────────────────────────────────────────

projects = {p.id: p for p in HouseProject.objects.all()}
print(f"Found {len(projects)} projects: {[p.name for p in projects.values()]}")

proj3 = projects.get(3)  # Jitu & Shristi
proj4 = projects.get(4)  # Radhika Mam

# ─── 2. Assign existing banks to correct projects ─────────────────────────────

bank_map = {
    "Rastriya Banijya Bank - Tulsipur": proj4,
    "Nepal Bank Ltd - Tulsipur": proj4,
    "NIC Asia Bank - Dang": proj3,
}

for b in BankAccount.objects.all():
    target_project = bank_map.get(b.name)
    if target_project and b.project != target_project:
        b.project = target_project
        b.save(update_fields=['project'])
        print(f"  ✅ Assigned '{b.name}' → Project {target_project.id} ({target_project.name})")
    elif b.project:
        print(f"  ↩  '{b.name}' already assigned to project {b.project_id}")
    else:
        print(f"  ⚠️  '{b.name}' not in bank_map, assigning to proj4 as default")
        b.project = proj4
        b.save(update_fields=['project'])

# ─── 3. Create a dedicated bank for Project 3 if it has none ─────────────────

if proj3:
    p3_banks = BankAccount.objects.filter(project=proj3)
    if not p3_banks.exists():
        print(f"\n  Creating bank for Project 3...")
        # Find a unique GL code
        existing_codes = set(Account.objects.values_list('code', flat=True))
        new_code = next(str(c) for c in range(1000, 2000) if str(c) not in existing_codes)
        gl = Account.objects.create(
            name="Bank - Global IME Bank - Bhairahawa",
            code=new_code,
            account_type=AccountType.ASSET
        )
        bank3 = BankAccount.objects.create(
            name="Global IME Bank - Bhairahawa",
            account_number="0012345678",
            gl_account=gl,
            project=proj3
        )

        # Seed an opening balance for this bank
        equity_acc, _ = Account.objects.get_or_create(
            name="Opening Balance Equity",
            defaults={'code': '3001', 'account_type': AccountType.EQUITY}
        )
        LedgerService.post_entry(
            date=datetime.date(2025, 11, 1),
            description="Opening balance - Jitu & Shristi construction fund",
            source_document=f"DEP-{str(bank3.id)[:8]}",
            lines=[
                {"account_id": gl.id, "entry_type": EntryType.DEBIT, "amount": Decimal("2500000"), "project_id": proj3.id},
                {"account_id": equity_acc.id, "entry_type": EntryType.CREDIT, "amount": Decimal("2500000"), "project_id": proj3.id},
            ]
        )
        print(f"  ✅ Created bank '{bank3.name}' with NPR 25,00,000 opening balance")
    else:
        print(f"\n  Project 3 already has {p3_banks.count()} bank(s)")

# ─── 4. Add opening balances to Tulsipur banks if zero ───────────────────────

equity_acc, _ = Account.objects.get_or_create(
    name="Opening Balance Equity",
    defaults={'code': '3001', 'account_type': AccountType.EQUITY}
)

opening_balances = {
    "Rastriya Banijya Bank - Tulsipur": Decimal("3000000"),
    "Nepal Bank Ltd - Tulsipur": Decimal("1500000"),
    "NIC Asia Bank - Dang": Decimal("2000000"),
}

for b in BankAccount.objects.select_related('gl_account').all():
    target_bal = opening_balances.get(b.name)
    if target_bal and b.gl_account.balance == Decimal("0"):
        LedgerService.post_entry(
            date=datetime.date(2025, 11, 1),
            description=f"Opening balance - {b.name}",
            source_document=f"DEP-{str(b.id)[:8]}",
            lines=[
                {"account_id": b.gl_account_id, "entry_type": EntryType.DEBIT, "amount": target_bal, "project_id": b.project_id},
                {"account_id": equity_acc.id, "entry_type": EntryType.CREDIT, "amount": target_bal, "project_id": b.project_id},
            ]
        )
        print(f"  ✅ Added NPR {target_bal:,} opening balance to '{b.name}'")
    elif target_bal:
        print(f"  ↩  '{b.name}' already has balance NPR {b.gl_account.balance:,}")

# ─── 5. Seed bills for Project 3 if it has none ──────────────────────────────

if proj3 and not VendorBill.objects.filter(project=proj3).exists():
    print(f"\n  Seeding bills for Project 3 ({proj3.name})...")
    phases = list(ConstructionPhase.objects.order_by('order'))
    expense_acc = Account.objects.filter(account_type=AccountType.EXPENSE).first()
    vendors = list(Vendor.objects.all()[:5])
    bank3 = BankAccount.objects.filter(project=proj3).first()

    bill_data = [
        (vendors[0], phases[0], "Architectural design & drawings", 95000, f"P3-INV-001"),
        (vendors[1], phases[2], "Steel reinforcement bars (12mm)", 180000, f"P3-INV-002"),
        (vendors[2], phases[2], "OPC Cement - 500 bags", 110000, f"P3-INV-003"),
        (vendors[0], phases[1], "Municipal permit fees", 45000, f"P3-INV-004"),
        (vendors[3], phases[3], "Foundation excavation labor", 70000, f"P3-INV-005"),
    ]

    for vendor, phase, desc, amt, inv in bill_data:
        if not VendorBill.objects.filter(invoice_number=inv).exists():
            bill = VendorBill.objects.create(
                vendor=vendor, project=proj3, phase=phase,
                date=datetime.date.today() - datetime.timedelta(days=random.randint(5, 25)),
                due_date=datetime.date.today() + datetime.timedelta(days=15),
                invoice_number=inv,
                description=desc,
                amount=Decimal(str(amt)),
                expense_account=expense_acc
            )
            PayableService.post_bill(bill)
            print(f"    ✅ Bill {inv}: NPR {amt:,} posted")

            # Pay 2 of 5 bills
            if inv in (f"P3-INV-001", f"P3-INV-004") and bank3:
                pay = BillPayment.objects.create(
                    bill=bill, bank_account=bank3,
                    date=datetime.date.today() - datetime.timedelta(days=random.randint(1,5)),
                    amount=bill.amount,
                    reference=f"PAY-{inv}"
                )
                PayableService.post_payment(pay)
                print(f"      💰 Paid {inv}")

# ─── 6. Seed phase budgets for Project 3 ─────────────────────────────────────

if proj3:
    budget_map = {
        'Naksa / Design (नक्सा)': 120000,
        'Municipal Approval (नक्सा पास)': 60000,
        'Jag Khanne (जग खन्ने)': 150000,
        'Foundation / DPC': 350000,
        'Pillar & Beam – Ground Floor': 500000,
        'Masonry / Eenta Laune (ईट्टा)': 280000,
        'Plaster / Dhuwai (ढुवाई)': 300000,
    }
    for phase in ConstructionPhase.objects.all():
        amt = budget_map.get(phase.name, 80000)
        _, created = PhaseBudgetLine.objects.get_or_create(
            project=proj3, phase=phase,
            defaults={'budgeted_amount': Decimal(str(amt))}
        )
        if created:
            print(f"  ✅ Budget set for phase '{phase.name}': NPR {amt:,}")

# ─── Final Summary ────────────────────────────────────────────────────────────

print("\n✅ DB fix & seed complete!")
print("\nFinal bank balances:")
for b in BankAccount.objects.select_related('gl_account', 'project').all():
    print(f"  [{b.project.name if b.project else 'GLOBAL'}] {b.name}: NPR {b.gl_account.balance:,}")
