"""
Seed complete Nepali construction accounting data.

Chart of Accounts follows standard Nepali construction practice:
  1xxx - Assets     (Cash, Bank, Receivables)
  2xxx - Liabilities (AP, Loans)
  3xxx - Equity      (Owner capital)
  4xxx - Revenue     (Contract receipts)
  5xxx - Expenses    (Civil, Electrical, Labor, Materials, Overhead)

Seeds:
  - Chart of Accounts (Nepali construction pattern)
  - Bank accounts (Nabil, Global IME, Cash)
  - Capital sources (Owner savings + Bank loan)
  - Vendors / Contractors
  - Phase Budget Lines for Radhika project
  - Contractor Payment Requests (11 milestones)
  - Sample bills (materials, labor)
"""

from decimal import Decimal
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounting.models.ledger import Account, AccountType
from apps.accounting.models.treasury import BankAccount, CapitalSource, CapitalSourceType
from apps.accounting.models.payables import Vendor, VendorBill, BillPayment, PurchaseOrder
from apps.accounting.models.budget import PhaseBudgetLine
from apps.accounting.models.construction import ContractorPaymentRequest
from apps.core.models import HouseProject, ConstructionPhase
from apps.accounting.services.ledger import LedgerService
from apps.accounting.services.payables import PayableService
from apps.accounting.services.treasury import TreasuryService


def ga(code):
    """Get Account by code."""
    return Account.objects.get(code=code)


class Command(BaseCommand):
    help = "Seed complete Nepali construction accounting data"

    def add_arguments(self, parser):
        parser.add_argument('--project', type=int, help='Project ID (default: Radhika project)')
        parser.add_argument('--reset', action='store_true', help='Clear existing accounting data first')

    def handle(self, *args, **options):
        if options['reset']:
            self.stdout.write(self.style.WARNING("Clearing existing accounting data..."))
            BillPayment.objects.all().delete()
            VendorBill.objects.all().delete()
            PurchaseOrder.objects.all().delete()
            ContractorPaymentRequest.objects.all().delete()
            PhaseBudgetLine.objects.all().delete()
            CashTransfer = None  # avoid circular import issue
            CapitalSource.objects.all().delete()
            BankAccount.objects.all().delete()
            Account.objects.all().delete()
            Vendor.objects.all().delete()

        with transaction.atomic():
            self._seed_accounts()
            self._seed_banks()
            self._seed_capital()
            self._seed_vendors()

            # Find Radhika project
            project_id = options.get('project')
            if project_id:
                project = HouseProject.objects.get(pk=project_id)
            else:
                project = HouseProject.objects.filter(owner_name__icontains='Radhika').first()

            if project:
                self._seed_phase_budgets(project)
                self._seed_payment_requests(project)
                self._seed_sample_bills(project)
            else:
                self.stdout.write(self.style.WARNING("No Radhika project found — skipping project-specific data"))

        self.stdout.write(self.style.SUCCESS("\n✅ Accounting data seeded successfully!"))

    def _seed_accounts(self):
        self.stdout.write("\n📒 Seeding Chart of Accounts...")
        accounts = [
            # ── ASSETS ─────────────────────────────────────────────────
            ("1001", "नगद (Cash in Hand)",              AccountType.ASSET),
            ("1010", "Nabil Bank - Current Account",    AccountType.ASSET),
            ("1011", "Global IME Bank - Savings",       AccountType.ASSET),
            ("1020", "Site Petty Cash",                  AccountType.ASSET),
            ("1101", "Accounts Receivable",              AccountType.ASSET),
            ("1201", "Construction Materials Stock",     AccountType.ASSET),
            ("1202", "Tools & Equipment",               AccountType.ASSET),
            # ── LIABILITIES ────────────────────────────────────────────
            ("2000", "Accounts Payable (AP)",           AccountType.LIABILITY),
            ("2010", "Contractor Payables",              AccountType.LIABILITY),
            ("2020", "Retention Payable",               AccountType.LIABILITY),
            ("2500", "Nabil Bank Loan",                 AccountType.LIABILITY),
            ("2510", "Personal Loan",                   AccountType.LIABILITY),
            # ── EQUITY ─────────────────────────────────────────────────
            ("3000", "Owner's Capital (धनी पुँजी)",     AccountType.EQUITY),
            ("3100", "Retained Surplus",                AccountType.EQUITY),
            # ── REVENUE ────────────────────────────────────────────────
            ("4000", "Contract Receipt Income",         AccountType.REVENUE),
            ("4100", "Other Income",                    AccountType.REVENUE),
            # ── EXPENSES ───────────────────────────────────────────────
            ("5000", "Project Expenses (General)",      AccountType.EXPENSE),
            ("5100", "Civil Work Expenses",             AccountType.EXPENSE),
            ("5110", "Foundation & Earthwork",          AccountType.EXPENSE),
            ("5120", "Masonry & Brickwork",             AccountType.EXPENSE),
            ("5130", "Concrete & RCC Work",             AccountType.EXPENSE),
            ("5140", "Steel & Reinforcement",           AccountType.EXPENSE),
            ("5200", "Material Purchases - Cement",     AccountType.EXPENSE),
            ("5201", "Material Purchases - Steel",      AccountType.EXPENSE),
            ("5202", "Material Purchases - Sand/Gravel",AccountType.EXPENSE),
            ("5203", "Material Purchases - Bricks",     AccountType.EXPENSE),
            ("5204", "Material Purchases - Other",      AccountType.EXPENSE),
            ("5300", "Labor / ज्यालादारी Expenses",    AccountType.EXPENSE),
            ("5310", "Mason Labor",                     AccountType.EXPENSE),
            ("5320", "Helper / Casual Labor",           AccountType.EXPENSE),
            ("5400", "Electrical Work Expenses",        AccountType.EXPENSE),
            ("5500", "Plumbing Work Expenses",          AccountType.EXPENSE),
            ("5600", "Finishing Work Expenses",         AccountType.EXPENSE),
            ("5700", "Contractor Payment Expenses",     AccountType.EXPENSE),
            ("5800", "Permits & Legal Fees",            AccountType.EXPENSE),
            ("5900", "Transport & Site Expenses",       AccountType.EXPENSE),
            ("5910", "Miscellaneous Expenses",          AccountType.EXPENSE),
        ]
        for code, name, atype in accounts:
            acc, created = Account.objects.get_or_create(
                code=code,
                defaults={'name': name, 'account_type': atype}
            )
            verb = "✅" if created else "  "
            self.stdout.write(f"  {verb} {code}: {name}")

    def _seed_banks(self):
        self.stdout.write("\n🏦 Seeding Bank Accounts...")
        banks = [
            ("Nabil Bank - Current Account", "0101234567891",  "1010"),
            ("Global IME Bank - Savings",    "0321234567892",  "1011"),
            ("Site Petty Cash",              None,              "1020"),
        ]
        for name, acct_num, gl_code in banks:
            gl_acc = ga(gl_code)
            bank, created = BankAccount.objects.get_or_create(
                name=name,
                defaults={'account_number': acct_num, 'gl_account': gl_acc}
            )
            self.stdout.write(f"  {'✅' if created else '  '} {name}")

            # Seed an opening balance journal entry for demo
            if created:
                initial = {"Nabil Bank - Current Account": 3000000, "Global IME Bank - Savings": 1500000, "Site Petty Cash": 50000}.get(name, 0)
                if initial:
                    try:
                        LedgerService.post_entry(
                            date=date(2026, 5, 1),
                            description=f"Opening Balance — {name}",
                            source_document=f"OB-{gl_code}",
                            lines=[
                                {"account_id": gl_acc.id, "entry_type": "DEBIT", "amount": Decimal(str(initial))},
                                {"account_id": ga("3000").id, "entry_type": "CREDIT", "amount": Decimal(str(initial))},
                            ]
                        )
                    except Exception:
                        pass

    def _seed_capital(self):
        self.stdout.write("\n💰 Seeding Capital Sources...")
        sources = [
            ("Owner Personal Savings", CapitalSourceType.SAVINGS,    "3000", Decimal("5000000")),
            ("Nabil Bank Project Loan", CapitalSourceType.LOAN,      "2500", Decimal("7500000")),
        ]
        for name, stype, gl_code, amount in sources:
            CapitalSource.objects.get_or_create(
                name=name,
                defaults={'source_type': stype, 'gl_account': ga(gl_code), 'budgeted_amount': amount}
            )
            self.stdout.write(f"  ✅ {name} (NPR {amount:,.0f})")

    def _seed_vendors(self):
        self.stdout.write("\n🏗️  Seeding Vendors / Contractors...")
        vendors = [
            ("Skill Sewa Consultancy & Construction",   "9857000001", "Tulsipur, Dang",           "CIV-001", "Civil Contractor"),
            ("Panchakanya Steel & Traders",              "9857000002", "Tulsipur Bazar, Dang",     "PAN-101", "Material Supplier"),
            ("Shree Ram Cement Store",                   "9857000003", "Ghorahi, Dang",            "PAN-202", "Material Supplier"),
            ("Dang Sand & Gravel Supply",                "9857000004", "Lamahi, Dang",             None,      "Material Supplier"),
            ("Nepal Electrical Works",                   "9857000005", "Tulsipur, Dang",           None,      "Electrical Contractor"),
            ("Sita Plumbing & Sanitation",               "9857000006", "Tulsipur, Dang",           None,      "Plumbing Contractor"),
            ("Ram Bahadur — Mason (ढलान ठेकेदार)",       "9800000007", "Tulsipur-4, Dang",         None,      "Labor Contractor"),
            ("Krishna Bahadur — Labor Supervisor",       "9800000008", "Tulsipur-6, Dang",         None,      "Labor Contractor"),
        ]
        for name, phone, address, pan, category in vendors:
            vendor, created = Vendor.objects.get_or_create(
                name=name,
                defaults={'phone': phone, 'address': address, 'pan_number': pan, 'category': category}
            )
            self.stdout.write(f"  {'✅' if created else '  '} {name}")

    def _seed_phase_budgets(self, project):
        self.stdout.write(f"\n📊 Seeding Phase Budgets for {project.name}...")
        phases = ConstructionPhase.objects.filter(project=project).order_by('order')
        for phase in phases:
            PhaseBudgetLine.objects.get_or_create(
                project=project,
                phase=phase,
                defaults={'budgeted_amount': phase.estimated_budget}
            )
            self.stdout.write(f"  ✅ {phase.name}: NPR {phase.estimated_budget:,.2f}")

    def _seed_payment_requests(self, project):
        self.stdout.write(f"\n📋 Seeding Contractor Payment Requests for {project.name}...")
        contractor = Vendor.objects.filter(name__icontains='Skill Sewa').first()
        if not contractor:
            self.stdout.write(self.style.WARNING("  Skill Sewa vendor not found — skipping"))
            return

        phases = ConstructionPhase.objects.filter(project=project).order_by('order')
        # Map phases to payment requests with realistic statuses
        phase_configs = [
            # (completion %, retention %, status)
            (100, 5, ContractorPaymentRequest.Status.APPROVED),   # Advance
            (100, 5, ContractorPaymentRequest.Status.APPROVED),   # Footing
            (100, 5, ContractorPaymentRequest.Status.PENDING),    # DPC
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # GF Wall
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # GF Slab
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # 1F Wall
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # 1F Slab
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # 2F Wall
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # 2F Slab
            (0,   5, ContractorPaymentRequest.Status.DRAFT),      # Finishing
        ]
        for i, phase in enumerate(phases):
            if i >= len(phase_configs):
                break
            completion, retention_pct, req_status = phase_configs[i]
            claimed = phase.estimated_budget
            retention = (claimed * Decimal(str(retention_pct)) / 100).quantize(Decimal("0.01"))
            net = claimed - retention

            pr, created = ContractorPaymentRequest.objects.get_or_create(
                project=project,
                phase=phase,
                contractor=contractor,
                defaults={
                    'description': f"Payment claim for {phase.name} — {completion}% complete",
                    'work_completion_percentage': Decimal(str(completion)),
                    'claimed_amount': claimed,
                    'retention_amount': retention,
                    'net_payable': net,
                    'status': req_status,
                }
            )
            self.stdout.write(f"  {'✅' if created else '  '} [{req_status}] {phase.name}: NPR {net:,.2f}")

    def _seed_sample_bills(self, project):
        self.stdout.write(f"\n🧾 Seeding Sample Material Bills for {project.name}...")
        steel_vendor = Vendor.objects.filter(name__icontains='Panchakanya').first()
        cement_vendor = Vendor.objects.filter(name__icontains='Shree Ram').first()
        sand_vendor   = Vendor.objects.filter(name__icontains='Sand').first()

        footing_phase = ConstructionPhase.objects.filter(project=project, name__icontains='Footing').first()
        dpc_phase     = ConstructionPhase.objects.filter(project=project, name__icontains='DPC').first()

        nabil = BankAccount.objects.filter(name__icontains='Nabil').first()

        bills_data = [
            # (vendor, invoice_no, date, due_date, desc, amount, phase, expense_code)
            (steel_vendor,  "INV-PSTL-001", date(2026, 5, 20), date(2026, 6, 5),
             "TMT Steel 16mm — 5MT for Footing", Decimal("425000"), footing_phase, "5201"),
            (steel_vendor,  "INV-PSTL-002", date(2026, 5, 25), date(2026, 6, 10),
             "TMT Steel 12mm — 3MT for DPC",     Decimal("255000"), dpc_phase,     "5201"),
            (cement_vendor, "INV-SRC-101",  date(2026, 5, 22), date(2026, 6, 7),
             "OPC Cement 200 bags (50kg) — Footing", Decimal("82000"), footing_phase, "5200"),
            (cement_vendor, "INV-SRC-102",  date(2026, 5, 28), date(2026, 6, 12),
             "OPC Cement 150 bags — DPC Slab",    Decimal("61500"), dpc_phase,     "5200"),
            (sand_vendor,   "INV-SAND-001", date(2026, 5, 18), date(2026, 6, 3),
             "River Sand 15 cubic metre",          Decimal("37500"), footing_phase, "5202"),
        ]

        for vendor, inv_no, bill_date, due, desc, amt, phase, exp_code in bills_data:
            if not vendor:
                continue
            exp_acc = Account.objects.filter(code=exp_code).first()
            if not exp_acc:
                continue
            if VendorBill.objects.filter(invoice_number=inv_no).exists():
                self.stdout.write(f"  -- {inv_no} already exists, skipping")
                continue

            bill = VendorBill.objects.create(
                vendor=vendor,
                date=bill_date,
                due_date=due,
                invoice_number=inv_no,
                description=desc,
                amount=amt,
                expense_account=exp_acc,
                project=project,
                phase=phase,
            )
            try:
                PayableService.post_bill(bill)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"    GL post failed for {inv_no}: {e}"))

            # Partially pay two of the bills
            if nabil and inv_no in ("INV-PSTL-001", "INV-SRC-101"):
                pay_amt = (amt * Decimal("0.6")).quantize(Decimal("0.01"))
                payment = BillPayment.objects.create(
                    bill=bill, date=bill_date + timedelta(days=5),
                    bank_account=nabil, amount=pay_amt,
                    reference=f"CHQ-{inv_no}", notes="Partial payment"
                )
                try:
                    PayableService.post_payment(payment)
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"    Payment GL post failed: {e}"))

            self.stdout.write(f"  ✅ {inv_no}: NPR {amt:,.0f} ({vendor.name})")

        self.stdout.write(self.style.SUCCESS(f"\nDone seeding accounting data for {project.name}"))
