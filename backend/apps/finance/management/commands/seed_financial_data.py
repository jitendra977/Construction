"""
Management command: seed_financial_data
Adds 5 realistic funding sources with transaction history, 
15+ expenses across all phases, and proper payments tracking.

Usage:
    python manage.py seed_financial_data
    python manage.py seed_financial_data --wipe   (clears existing finance data first)
"""
from django.core.management.base import BaseCommand
from apps.core.models import HouseProject, ConstructionPhase
from apps.finance.models import BudgetCategory, FundingSource, FundingTransaction, Expense, Payment
from apps.resources.models import Material, Supplier, Contractor
from decimal import Decimal


class Command(BaseCommand):
    help = 'Seeds realistic funding sources, expenses, and full payment history'

    def add_arguments(self, parser):
        parser.add_argument('--wipe', action='store_true', help='Wipe existing finance data before seeding')

    def handle(self, *args, **options):
        if options['wipe']:
            self.stdout.write(self.style.WARNING('Wiping existing finance data...'))
            Payment.objects.all().delete()
            FundingTransaction.objects.all().delete()
            Expense.objects.all().delete()
            FundingSource.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Finance data wiped.'))

        project = HouseProject.objects.first()
        if not project:
            self.stdout.write(self.style.ERROR('No project found. Run seed_tulsipur_project first.'))
            return

        phases = {p.name: p for p in ConstructionPhase.objects.all()}
        categories = {c.name: c for c in BudgetCategory.objects.all()}
        suppliers = {s.name: s for s in Supplier.objects.all()}
        contractors = {c.name: c for c in Contractor.objects.all()}

        if not phases or not categories:
            self.stdout.write(self.style.ERROR('No phases or categories found. Run seed_tulsipur_project first.'))
            return

        # ---------- helper to find first available phase / category ----------
        def ph(name):
            for k, v in phases.items():
                if name.lower() in k.lower():
                    return v
            return list(phases.values())[0]

        def cat(name):
            for k, v in categories.items():
                if name.lower() in k.lower():
                    return v
            return list(categories.values())[0]

        def sup(name):
            for k, v in suppliers.items():
                if name.lower() in k.lower():
                    return v
            return None

        def con(name):
            for k, v in contractors.items():
                if name.lower() in k.lower():
                    return v
            return None

        # ═══════════════════════════════════════════════════════════════
        #  1. FUNDING SOURCES  (5 realistic Nepali sources)
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write('\n📦 Creating Funding Sources...')

        funding_data = [
            # name, type, amount, received_date, method, interest_rate, notes
            (
                "NIC Asia Home Loan",
                "LOAN", "8000000", "2024-01-10", "BANK_TRANSFER", "11.5",
                "20-year home loan @ 11.5% p.a. EMI: Rs 83,200/month. Account: 0120480012345678"
            ),
            (
                "Personal Savings – Nabil Bank",
                "OWN_MONEY", "3500000", "2024-01-05", "BANK_TRANSFER", "0",
                "Personal savings account. Acc No: 10101-01-012345-6. Nabil Bank, Tulsipur Branch"
            ),
            (
                "Loan from Bhai (USA)",
                "BORROWED", "2000000", "2024-02-01", "BANK_TRANSFER", "0",
                "Interest-free loan from younger brother settled in USA. To be repaid within 2 years."
            ),
            (
                "Laxmi Sunrise Salary Account",
                "OWN_MONEY", "1200000", "2024-01-01", "BANK_TRANSFER", "0",
                "Monthly salary credited here. Acc: 00800100012345. Used for day-to-day site expenses."
            ),
            (
                "Grameen Sahakari (Co-op Loan)",
                "BORROWED", "500000", "2024-03-01", "CASH", "14.0",
                "Short-term coopera tive loan @ 14% p.a. Used for urgent material purchases."
            ),
        ]

        fs = {}
        for name, ftype, amt, rdate, method, rate, notes in funding_data:
            obj = FundingSource.objects.create(
                name=name,
                source_type=ftype,
                amount=Decimal(amt),
                received_date=rdate,
                default_payment_method=method,
                interest_rate=Decimal(rate),
                current_balance=Decimal(amt),  # full initially – will be adjusted by payments
                notes=notes,
            )
            fs[name] = obj
            self.stdout.write(f'  ✅ {name}  →  Rs. {int(Decimal(amt)):,}')

        # ── Extra top-ups (FundingTransaction CREDIT) ──────────────────
        topups = [
            # source, amount, date, description
            ("NIC Asia Home Loan",        "2000000", "2024-03-01", "2nd Tranche Disbursement"),
            ("Personal Savings – Nabil Bank", "800000", "2024-04-01", "Fixed Deposit Matured"),
            ("Laxmi Sunrise Salary Account",  "120000", "2024-03-05", "March Salary Credit"),
            ("Laxmi Sunrise Salary Account",  "120000", "2024-04-05", "April Salary Credit"),
            ("Laxmi Sunrise Salary Account",  "120000", "2024-05-05", "May Salary Credit"),
        ]
        for src_name, amt, date, desc in topups:
            src = fs[src_name]
            FundingTransaction.objects.create(
                funding_source=src,
                amount=Decimal(amt),
                transaction_type='CREDIT',
                date=date,
                description=desc,
            )
            src.current_balance += Decimal(amt)
            src.amount += Decimal(amt)   # keep amount synced with total credits
            src.save(update_fields=['current_balance', 'amount'])
            self.stdout.write(f'     ➕ Top-up {src_name}: Rs. {int(Decimal(amt)):,}')

        # ═══════════════════════════════════════════════════════════════
        #  2. EXPENSES + PAYMENTS
        # ═══════════════════════════════════════════════════════════════
        self.stdout.write('\n📋 Creating Expenses & Payments...')

        def make_expense(title, amount, date, phase_key, cat_key,
                         etype='OTHER', supplier_key=None, contractor_key=None,
                         paid_to='', notes='', funding_key=None,
                         payments=None):
            """
            payments = list of (amount, date, method, funding_key, ref)
            """
            fs_obj = fs.get(funding_key) if funding_key else None
            sup_obj = sup(supplier_key) if supplier_key else None
            con_obj = con(contractor_key) if contractor_key else None

            total_paid = sum(Decimal(str(p[0])) for p in (payments or []))
            is_paid = total_paid >= Decimal(str(amount))

            exp = Expense.objects.create(
                title=title,
                amount=Decimal(str(amount)),
                date=date,
                category=cat(cat_key),
                phase=ph(phase_key),
                expense_type=etype,
                supplier=sup_obj,
                contractor=con_obj,
                paid_to=paid_to or (sup_obj.name if sup_obj else (con_obj.name if con_obj else '')),
                is_paid=is_paid,
                funding_source=fs_obj,
                notes=notes,
            )

            for pamt, pdate, pmethod, pfkey, pref in (payments or []):
                pfs = fs.get(pfkey) if pfkey else fs_obj
                Payment.objects.create(
                    expense=exp,
                    amount=Decimal(str(pamt)),
                    date=pdate,
                    method=pmethod,
                    reference_id=pref or '',
                    funding_source=pfs,
                )
                # Deduct from funding source balance
                if pfs:
                    pfs.current_balance -= Decimal(str(pamt))
                    pfs.save(update_fields=['current_balance'])

            self.stdout.write(f'  💸 {title[:55]:55s} Rs. {int(amount):>10,}  [{("PAID" if is_paid else "PARTIAL") if payments else "UNPAID"}]')
            return exp

        # ── 1. Permit & Consulting ─────────────────────────────────────
        make_expense(
            "Nagarpalika Naksa Pass Fee (Municipal Permit)",
            45000, "2024-01-20", "Planning", "Consulting",
            etype="GOVT", paid_to="Tulsipur Sub-Metropolitan City",
            funding_key="Personal Savings – Nabil Bank",
            payments=[
                (45000, "2024-01-20", "CASH", "Personal Savings – Nabil Bank", ""),
            ]
        )

        make_expense(
            "Structural Engineer Consultant Fee",
            35000, "2024-01-25", "Planning", "Consulting",
            etype="LABOR", paid_to="Er. Sanjay Yadav",
            notes="Structural drawings and reinforcement schedule",
            funding_key="Personal Savings – Nabil Bank",
            payments=[
                (20000, "2024-01-25", "CASH", "Personal Savings – Nabil Bank", ""),
                (15000, "2024-02-05", "CASH", "Personal Savings – Nabil Bank", ""),
            ]
        )

        # ── 2. Site Preparation ────────────────────────────────────────
        make_expense(
            "Site Cleaning & Leveling (Labour)",
            18000, "2024-02-05", "Site Preparation", "Labor",
            etype="LABOR", paid_to="Daily Labour (12 men × 1 day)",
            funding_key="Laxmi Sunrise Salary Account",
            payments=[
                (18000, "2024-02-05", "CASH", "Laxmi Sunrise Salary Account", ""),
            ]
        )

        make_expense(
            "Soil Boring Test – Site Investigation",
            12000, "2024-02-10", "Site Preparation", "Consulting",
            etype="GOVT", paid_to="Nepal Geo-Technical Labs, Tulsipur",
            funding_key="Personal Savings – Nabil Bank",
            payments=[
                (12000, "2024-02-10", "CASH", "Personal Savings – Nabil Bank", ""),
            ]
        )

        # ── 3. Foundation ──────────────────────────────────────────────
        make_expense(
            "Foundation Excavation – Ram Bahadur Thekedar",
            150000, "2024-02-18", "Foundation", "Labor",
            etype="LABOR", contractor_key="Ram Bahadur",
            funding_key="NIC Asia Home Loan",
            notes="Advance + labour charges for full excavation work",
            payments=[
                (75000,  "2024-02-18", "CASH",          "NIC Asia Home Loan", ""),
                (75000,  "2024-03-01", "BANK_TRANSFER",  "NIC Asia Home Loan", "IPS-AA-2024-0301"),
            ]
        )

        make_expense(
            "Cement – 120 Bags Argakhanchi OPC 43 Grade",
            102000, "2024-02-20", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="NIC Asia Home Loan",
            notes="120 bags × Rs. 850 = Rs. 1,02,000",
            payments=[
                (60000,  "2024-02-20", "BANK_TRANSFER", "NIC Asia Home Loan", "CHQ-NIC-88221"),
                (42000,  "2024-03-05", "BANK_TRANSFER", "NIC Asia Home Loan", "CHQ-NIC-88299"),
            ]
        )

        make_expense(
            "Sand (Baluwa) – 5 Trucks River Sand",
            125000, "2024-02-22", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="NIC Asia Home Loan",
            notes="5 trucks × Rs. 25,000 each",
            payments=[
                (125000, "2024-02-22", "CASH", "NIC Asia Home Loan", ""),
            ]
        )

        make_expense(
            "Aggregate (Gitti) – 4 Trucks 20mm Stone",
            112000, "2024-02-24", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="NIC Asia Home Loan",
            notes="4 trucks × Rs. 28,000",
            payments=[
                (70000, "2024-02-24", "CASH", "NIC Asia Home Loan", ""),
                (42000, "2024-03-10", "CASH", "NIC Asia Home Loan", ""),
            ]
        )

        make_expense(
            "TMT Fe500 Steel Bars – 2 Ton 12mm",
            210000, "2024-02-26", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Ambe",
            funding_key="Loan from Bhai (USA)",
            notes="2 Ton × Rs. 1,05,000/ton. Ambe Steels Authorized",
            payments=[
                (120000, "2024-02-26", "BANK_TRANSFER", "Loan from Bhai (USA)", "IPS-JK-110034"),
                (90000,  "2024-03-12", "BANK_TRANSFER", "Loan from Bhai (USA)", "IPS-JK-110098"),
            ]
        )

        make_expense(
            "Bricks – 5000 Pcs No.1 Grade (Dang Bricks)",
            90000, "2024-02-28", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Dang Bricks",
            funding_key="Loan from Bhai (USA)",
            notes="5000 × Rs. 18 = Rs. 90,000",
            payments=[
                (50000, "2024-02-28", "CASH",          "Loan from Bhai (USA)", ""),
                (40000, "2024-03-15", "BANK_TRANSFER",  "Loan from Bhai (USA)", "IPS-JK-220045"),
            ]
        )

        make_expense(
            "Formwork & Shuttering Boards (Foundation)",
            28000, "2024-03-02", "Foundation", "Civil",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="NIC Asia Home Loan",
            notes="Timber shuttering boards for footing",
            payments=[
                (28000, "2024-03-02", "CASH", "NIC Asia Home Loan", ""),
            ]
        )

        # ── 4. Ground Floor ────────────────────────────────────────────
        make_expense(
            "Ground Floor Column & Beam Work – Thekedar",
            350000, "2024-04-05", "Ground Floor", "Civil",
            etype="LABOR", contractor_key="Ram Bahadur",
            funding_key="NIC Asia Home Loan",
            notes="Column casting, beam shuttering, reinforcement + concrete pour GF",
            payments=[
                (175000, "2024-04-05", "BANK_TRANSFER",  "NIC Asia Home Loan", "CHQ-NIC-99011"),
                (100000, "2024-04-20", "BANK_TRANSFER",  "NIC Asia Home Loan", "CHQ-NIC-99088"),
                # Remaining 75,000 unpaid
            ]
        )

        make_expense(
            "Cement – 200 Bags for Ground Floor Slab",
            170000, "2024-04-10", "Ground Floor", "Civil",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="NIC Asia Home Loan",
            notes="200 bags × Rs. 850",
            payments=[
                (100000, "2024-04-10", "BANK_TRANSFER", "NIC Asia Home Loan", "CHQ-NIC-99120"),
                (70000,  "2024-04-25", "BANK_TRANSFER", "NIC Asia Home Loan", "CHQ-NIC-99175"),
            ]
        )

        make_expense(
            "Ground Floor Brickwork – Labour Only",
            85000, "2024-05-01", "Ground Floor", "Labor",
            etype="LABOR", contractor_key="Ram Bahadur",
            funding_key="Laxmi Sunrise Salary Account",
            notes="Brickwork wall construction GF – 2 मिस्त्री + 4 ज्यामी × 20 days",
            payments=[
                (50000, "2024-05-01", "CASH", "Laxmi Sunrise Salary Account", ""),
                (35000, "2024-05-18", "CASH", "Laxmi Sunrise Salary Account", ""),
            ]
        )

        # ── 5. MEP & Electrical ────────────────────────────────────────
        make_expense(
            "Electrical Conduit Pipe & Wiring Materials",
            65000, "2024-04-15", "Electrical", "MEP",
            etype="MATERIAL", supplier_key="Electric",
            funding_key="Grameen Sahakari (Co-op Loan)",
            notes="3-core wires 100m, conduit 80pcs, switches, sockets bulk buy",
            payments=[
                (40000, "2024-04-15", "CASH", "Grameen Sahakari (Co-op Loan)", ""),
                (25000, "2024-05-01", "CASH", "Grameen Sahakari (Co-op Loan)", ""),
            ]
        )

        make_expense(
            "Plumbing – Jagdamba Pipes & Fittings",
            48000, "2024-04-18", "Electrical", "MEP",
            etype="MATERIAL", supplier_key="Electric",
            funding_key="Grameen Sahakari (Co-op Loan)",
            notes="½'' & ¾'' pipes, elbows, tees, ball valves",
            payments=[
                (48000, "2024-04-18", "CASH", "Grameen Sahakari (Co-op Loan)", ""),
            ]
        )

        make_expense(
            "Electrician Labour – Shyam Electrician (Advance)",
            60000, "2024-05-10", "Electrical", "Labor",
            etype="LABOR", contractor_key="Shyam",
            funding_key="Laxmi Sunrise Salary Account",
            notes="Advance for house wiring – full job. Balance payable after inspection.",
            payments=[
                (30000, "2024-05-10", "CASH", "Laxmi Sunrise Salary Account", ""),
                # 30,000 still due
            ]
        )

        make_expense(
            "Plumber Labour – Hari Plumber",
            45000, "2024-05-15", "Electrical", "Labor",
            etype="LABOR", contractor_key="Hari",
            funding_key="Laxmi Sunrise Salary Account",
            notes="Water supply and drainage rough-in work",
            payments=[
                (25000, "2024-05-15", "CASH", "Laxmi Sunrise Salary Account", ""),
                (20000, "2024-06-01", "CASH", "Laxmi Sunrise Salary Account", ""),
            ]
        )

        # ── 6. Finishing ───────────────────────────────────────────────
        make_expense(
            "Internal Plastering – Ram Bahadur (GF only)",
            120000, "2024-06-05", "Finishing", "Civil",
            etype="LABOR", contractor_key="Ram Bahadur",
            funding_key="Personal Savings – Nabil Bank",
            notes="Internal plaster all rooms GF. Rate: Rs. 120/sqft × 1000 sqft",
            payments=[
                (60000, "2024-06-05", "BANK_TRANSFER", "Personal Savings – Nabil Bank", "IPS-NT-551122"),
                # 60,000 pending after snagging
            ]
        )

        make_expense(
            "Paint Materials – Dulux Weathershield + Primer",
            55000, "2024-06-15", "Finishing", "Finishing",
            etype="MATERIAL", supplier_key="Tulsipur Paint",
            funding_key="Personal Savings – Nabil Bank",
            notes="20L Weathershield × 4, Primer 10L × 4, White Cement",
            payments=[
                (55000, "2024-06-15", "CASH", "Personal Savings – Nabil Bank", ""),
            ]
        )

        make_expense(
            "Floor Tiles – Somany Glazed Vitrified 600×600",
            185000, "2024-07-01", "Finishing", "Finishing",
            etype="MATERIAL", supplier_key="Rapti",
            funding_key="Personal Savings – Nabil Bank",
            notes="1200 sqft × Rs. 155/sqft approx. 3 rooms + kitchen + toilets",
            payments=[
                (100000, "2024-07-01", "BANK_TRANSFER", "Personal Savings – Nabil Bank", "IPS-NT-661233"),
                (85000,  "2024-07-20", "BANK_TRANSFER", "Personal Savings – Nabil Bank", "IPS-NT-661299"),
            ]
        )

        # ── 7. Pending / Upcoming (no payments yet) ────────────────────
        make_expense(
            "Staircase Railing & Grill – Ramesh Welder",
            75000, "2024-08-10", "Roofing", "Civil",
            etype="LABOR", contractor_key="Ramesh",
            funding_key="NIC Asia Home Loan",
            notes="MS square pipe railing + window grills. Pending fabrication."
        )

        make_expense(
            "Overhead Water Tank – Sintex 2000L",
            28000, "2024-09-01", "Roofing", "MEP",
            etype="MATERIAL", supplier_key="Electric",
            paid_to="New Electric & Sanitary",
            funding_key="Grameen Sahakari (Co-op Loan)",
            notes="Sintex double-layered 2000L + fittings. Installation pending."
        )

        # ─────────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write(self.style.SUCCESS('✅  Financial seed complete!'))
        self.stdout.write('')
        self.stdout.write('  Funding Sources  : 5')
        self.stdout.write('  Extra Top-ups    : 5')
        self.stdout.write('  Expenses created : 21')
        self.stdout.write('')
        self.stdout.write('  Run "python manage.py recalculate_balances" if')
        self.stdout.write('  balances appear mismatched.')
        self.stdout.write(self.style.SUCCESS('━' * 60))
