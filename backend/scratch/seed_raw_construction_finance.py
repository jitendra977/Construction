import os, sys, django
from decimal import Decimal
import datetime
import random

# Setup Django environment
sys.path.append('/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.accounting.models.ledger import Account, AccountType, JournalEntry, EntryType
from apps.accounting.models.treasury import BankAccount, CapitalSource, CashTransfer
from apps.accounting.models.payables import Vendor, VendorBill, BillPayment
from apps.accounting.models.construction import ContractorPaymentRequest
from apps.accounting.models.budget import PhaseBudgetLine
from apps.accounting.services.payables import PayableService
from apps.accounting.services.treasury import TreasuryService
from apps.accounting.services.ledger import LedgerService

def seed_raw_data():
    print("🚀 Seeding rich raw data for construction accounting (ALL PROJECTS)...")

    projects = HouseProject.objects.all()
    if not projects.exists():
        print("❌ No projects found.")
        return

    phases = ConstructionPhase.objects.all().order_by('order')
    gl_bank1 = Account.objects.get(code="1001")
    gl_bank2 = Account.objects.get(code="1002")
    bank1 = BankAccount.objects.get(gl_account=gl_bank1)
    bank2 = BankAccount.objects.get(gl_account=gl_bank2)
    expense_acc = Account.objects.get(code="5000")

    # 1. Vendors (Global)
    vendors_data = [
        ("Kalika Steel & Hardware", "9851012345"),
        ("Panchakanya Group", "9851054321"),
        ("Jagadamba Cement", "9841223344"),
        ("Local Labor Group (Hari)", "9811001122"),
        ("Siddhartha Tiles", "9841887766"),
    ]
    vendors = []
    for name, phone in vendors_data:
        v, _ = Vendor.objects.get_or_create(name=name, defaults={'phone': phone})
        vendors.append(v)

    budget_map = {
        'Naksa / Design (नक्सा)': 150000,
        'Municipal Approval (नक्सा पास)': 80000,
        'Jag Khanne (जग खन्ने)': 200000,
        'Foundation / DPC': 400000,
        'Pillar & Beam – Ground Floor': 600000,
        'Masonry / Eenta Laune (ईट्टा)': 300000,
        'Plaster / Dhuwai (ढुवाई)': 350000,
    }

    for project in projects:
        print(f"--- Seeding for Project: {project.name} ---")
        
        # 2. Phase Budgets
        for phase in phases:
            amt = budget_map.get(phase.name, 100000)
            PhaseBudgetLine.objects.get_or_create(
                project=project, phase=phase,
                defaults={'budgeted_amount': Decimal(str(amt))}
            )
        print(f"  [Budget] Phase budgets initialized for {project.name}")

        # 3. Vendor Bills
        bill_scenarios = [
            (vendors[0], phases[0], f"Design Fees - {project.name}", 120000, f"INV-{project.id}-001"),
            (vendors[1], phases[2], f"Steel bars - {project.name}", 150000, f"INV-{project.id}-002"),
            (vendors[2], phases[2], f"Cement bags - {project.name}", 85000, f"INV-{project.id}-003"),
        ]

        for vendor, phase, desc, amt, inv in bill_scenarios:
            if not VendorBill.objects.filter(invoice_number=inv).exists():
                bill = VendorBill.objects.create(
                    vendor=vendor, project=project, phase=phase,
                    date=datetime.date.today() - datetime.timedelta(days=random.randint(5, 30)),
                    due_date=datetime.date.today() + datetime.timedelta(days=7),
                    invoice_number=inv, description=desc,
                    amount=Decimal(str(amt)), expense_account=expense_acc
                )
                PayableService.post_bill(bill)
                print(f"  [Bill] {inv} posted.")

                # 4. Pay some bills
                if random.choice([True, False]):
                    payment = BillPayment.objects.create(
                        bill=bill, bank_account=random.choice([bank1, bank2]),
                        date=datetime.date.today(), amount=bill.amount,
                        reference=f"PAY-{inv}"
                    )
                    PayableService.post_payment(payment)
                    print(f"    [Payment] {inv} paid.")

        # 5. Contractor Payment Requests (PENDING)
        if not ContractorPaymentRequest.objects.filter(project=project, status='PENDING').exists():
            pr = ContractorPaymentRequest.objects.create(
                project=project, phase=phases[4], contractor=vendors[3],
                description=f"Labor claim for {project.name} - 50% completion",
                work_completion_percentage=Decimal("50.00"),
                claimed_amount=Decimal("150000.00"),
                retention_amount=Decimal("7500.00"),
                net_payable=Decimal("142500.00"),
                status='PENDING'
            )
            print(f"  [PR] Pending Payment Request created for {project.name}")

    print("\n✅ Multi-project raw data seeding complete!")

if __name__ == "__main__":
    seed_raw_data()
