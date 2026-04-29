"""
Management command: seed_jitu_project
Seeds the REAL Jitu & Shristi House Construction project data extracted
from actual documents: Skill Sewa contract, payment receipts, and floor plans.

Usage:
    python manage.py seed_jitu_project
    python manage.py seed_jitu_project --wipe   (clears existing data first)
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from datetime import date


class Command(BaseCommand):
    help = 'Seeds the real Jitu & Shristi House Construction project data'

    def add_arguments(self, parser):
        parser.add_argument('--wipe', action='store_true',
                            help='Wipe existing project data before seeding')

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.core.models import HouseProject, ConstructionPhase, Floor, Room
        from apps.finance.models import (
            BudgetCategory, Account, Bill, BillItem, FundingSource, Expense,
        )
        from apps.resource.models import Supplier

        # ── Optional wipe ─────────────────────────────────────────────────────
        if options['wipe']:
            self.stdout.write(self.style.WARNING('⚠️  Wiping ALL existing project data...'))
            Room.objects.all().delete()
            Floor.objects.all().delete()
            ConstructionPhase.objects.all().delete()
            BudgetCategory.objects.all().delete()
            HouseProject.objects.all().delete()
            from apps.finance.models import (
                BillPayment, Bill, BillItem, Expense, Payment,
                FundingTransaction, FundingSource, JournalLine, JournalEntry,
                Account, BankTransfer, PurchaseOrder, PhaseBudgetAllocation,
            )
            for M in [BillPayment, BillItem, Bill, Payment, Expense,
                      FundingTransaction, FundingSource, JournalLine,
                      JournalEntry, BankTransfer, PurchaseOrder,
                      PhaseBudgetAllocation, Account]:
                M.objects.all().delete()
            Supplier.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('  ✅ All data wiped.\n'))

        # ═══════════════════════════════════════════════════════════════════════
        #  1. HOUSE PROJECT
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🏠 Creating House Project...')
        project = HouseProject.objects.create(
            name='Jitu & Shristi House Construction',
            owner_name='Jit Bahadur Khadka (C/O: Radhika K.C. Khadka)',
            address='Tulsipur-05, Doghare, Dang, Nepal',
            total_budget=Decimal('5000000'),
            start_date=date(2026, 2, 27),
            expected_completion_date=date(2027, 12, 31),
            area_sqft=3872,
        )
        self.stdout.write(f'  Created: {project.name}')
        self.stdout.write(f'  Budget: Rs. {project.total_budget:,.0f}')
        self.stdout.write(f'  Location: {project.address}')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  2. CONSTRUCTION PHASES
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🔨 Creating Construction Phases...')
        phases_data = [
            (1,  'Naksa / Design (नक्सा)',              100000, 'COMPLETED'),
            (2,  'Municipal Approval (नक्सा पास)',        25000, 'IN_PROGRESS'),
            (3,  'Jag Khanne (जग खन्ने)',               300000, 'PENDING'),
            (4,  'Foundation / DPC',                    400000, 'PENDING'),
            (5,  'Pillar & Beam – Ground Floor',        450000, 'PENDING'),
            (6,  'Ground Floor Slab (ढलान)',             350000, 'PENDING'),
            (7,  'Pillar & Beam – First Floor',         450000, 'PENDING'),
            (8,  'First Floor Slab (ढलान)',              350000, 'PENDING'),
            (9,  'Pillar & Beam – Second Floor',        400000, 'PENDING'),
            (10, 'Second Floor Slab (ढलान)',             350000, 'PENDING'),
            (11, 'Top Floor / Chhad (छत)',              300000, 'PENDING'),
            (12, 'Masonry / Eenta Laune (ईट्टा)',        400000, 'PENDING'),
            (13, 'Plaster / Dhuwai (ढुवाई)',             250000, 'PENDING'),
            (14, 'Electrical Wiring (बिजुली)',           200000, 'PENDING'),
            (15, 'Plumbing / Sanitary (प्लम्बिङ)',       150000, 'PENDING'),
            (16, 'Painting (रंगरोगन)',                   200000, 'PENDING'),
            (17, 'Doors & Windows (ढोका/झ्याल)',        250000, 'PENDING'),
            (18, 'Tile / Flooring (टाइल)',               250000, 'PENDING'),
            (19, 'Railing / Boundary Wall',             150000, 'PENDING'),
            (20, 'Finishing & Handover',                100000, 'PENDING'),
        ]
        phases = {}
        for order, name, budget, status in phases_data:
            phase, _ = ConstructionPhase.objects.get_or_create(
                name=name,
                project=project,
                defaults=dict(
                    order=order,
                    estimated_budget=Decimal(str(budget)),
                    status=status,
                ),
            )
            phases[name] = phase
            icon = {'COMPLETED': '✅', 'IN_PROGRESS': '🔄', 'PENDING': '⏳'}[status]
            self.stdout.write(f'  {icon} {order:2d}. {name}  Rs. {budget:>10,}')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  3. FLOORS & ROOMS
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🏢 Creating Floors & Rooms...')
        floors_data = [
            ('Ground Floor (तल्ला)', 0, [
                ('Garage', 150), ('Living Room (बैठक)', 200),
                ('Kitchen (भन्सा)', 100), ('Bathroom', 40),
                ('Store Room', 60), ('Puja Room (पूजा कोठा)', 50),
            ]),
            ('First Floor (पहिलो तल्ला)', 1, [
                ('Master Bedroom', 200), ('Bedroom 2', 150),
                ('Bathroom', 50), ('Balcony', 60), ('Hall', 140),
            ]),
            ('Second Floor (दोस्रो तल्ला)', 2, [
                ('Bedroom 3', 180), ('Bedroom 4', 150),
                ('Bathroom', 50), ('Balcony', 60), ('Study Room', 100),
            ]),
            ('Top Floor (छत)', 3, [
                ('Open Terrace', 300), ('Utility Room', 80),
                ('Water Tank Room', 40),
            ]),
        ]
        for floor_name, level, rooms in floors_data:
            floor, _ = Floor.objects.get_or_create(
                name=floor_name,
                project=project,
                defaults=dict(level=level),
            )
            for room_name, area in rooms:
                Room.objects.get_or_create(
                    name=room_name, floor=floor,
                    defaults=dict(area_sqft=area),
                )
            self.stdout.write(f'  🏠 {floor_name}: {", ".join(r[0] for r in rooms)}')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  4. BUDGET CATEGORIES
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('📊 Creating Budget Categories...')
        categories_data = [
            ('Design & Permits',          150000),
            ('Foundation & Structure',   1500000),
            ('Masonry & Brickwork',       400000),
            ('Plaster & Finishing',       450000),
            ('Electrical',                200000),
            ('Plumbing & Sanitary',       150000),
            ('Doors, Windows & Railing',  400000),
            ('Flooring & Tiles',          350000),
            ('Painting',                  200000),
            ('Labour',                    800000),
            ('Water Tank & Septic',       150000),
            ('Contingency',               250000),
        ]
        cats = {}
        for name, alloc in categories_data:
            cat, _ = BudgetCategory.objects.get_or_create(
                name=name,
                project=project,
                defaults=dict(allocation=Decimal(str(alloc))),
            )
            cats[name] = cat
            self.stdout.write(f'  📁 {name:30s} Rs. {alloc:>10,}')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  5. GL ACCOUNTS (Chart of Accounts)
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🗂️  Creating Chart of Accounts...')
        accounts_data = [
            ('1001', 'Personal Savings (Cash)',  'ASSET',     'Cash in hand for site expenses'),
            ('1002', 'Nabil Bank Account',       'ASSET',     'Nabil Bank Tulsipur Branch savings'),
            ('2001', 'Accounts Payable',         'LIABILITY', 'Outstanding amounts owed to vendors/contractors'),
            ('3001', "Owner's Equity",           'EQUITY',    'Capital invested by Jit Bahadur Khadka'),
            ('5001', 'Design & Permit Expense',  'EXPENSE',   'Architecture, structural drawings, municipal fees'),
            ('5002', 'Material Expense',         'EXPENSE',   'Cement, Steel, Bricks, Sand'),
            ('5003', 'Labour Expense',           'EXPENSE',   'Mistri, Jyami, Electrician, Plumber wages'),
            ('5004', 'Contractor Expense',       'EXPENSE',   'Lump-sum thekedar payments'),
        ]
        accts = {}
        for code, name, atype, desc in accounts_data:
            acct, _ = Account.objects.get_or_create(
                code=code,
                project=project,
                defaults=dict(name=name, account_type=atype, description=desc),
            )
            accts[code] = acct
            self.stdout.write(f'  [{atype:9s}] {code} {name}')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  6. SUPPLIER
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🏢 Creating Suppliers...')
        skill_sewa, _ = Supplier.objects.get_or_create(
            project=project,
            name='Skill Sewa',
            defaults=dict(
                contact_person='Skill Sewa Team',
                phone='01-5915757',
                email='info@skillsewa.com',
                address='Baneshwor, Kathmandu',
                specialty='General',
                is_active=True,
            ),
        )
        self.stdout.write('  ✅ Skill Sewa (Baneshwor, Kathmandu)')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  7. FUNDING SOURCES
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('💰 Creating Funding Sources...')
        nabil_bank, _ = FundingSource.objects.get_or_create(
            name='Nabil Bank Savings',
            project=project,
            defaults=dict(
                source_type='OWN_MONEY',
                amount=Decimal('1500000'),
                default_payment_method='BANK_TRANSFER',
                received_date=date(2026, 1, 1),
                current_balance=Decimal('1500000'),
                associated_account=accts['1002'],
                notes='Personal savings for construction initial phases.',
            ),
        )
        emergency_cash, _ = FundingSource.objects.get_or_create(
            name='Cash in Hand (Nagad)',
            project=project,
            defaults=dict(
                source_type='OWN_MONEY',
                amount=Decimal('200000'),
                default_payment_method='CASH',
                received_date=date(2026, 1, 1),
                current_balance=Decimal('200000'),
                associated_account=accts['1001'],
                notes='Petty cash for site expenses.',
            ),
        )
        self.stdout.write('  ✅ Nabil Bank: Rs. 15,00,000')
        self.stdout.write('  ✅ Cash: Rs. 2,00,000')
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  8. HISTORICAL BILLS & EXPENSES (from actual receipts)
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('🧾 Recording Historical Transactions...')

        from apps.finance.services import BillService, FinanceService

        # Bill 1: Skill Sewa Phase 1 — Rs. 25,000 (PAID)
        bill1, b1_created = Bill.objects.get_or_create(
            bill_number='SKILL-041',
            defaults=dict(
                project=project,
                date_issued=date(2026, 2, 27),
                due_date=date(2026, 2, 27),
                total_amount=Decimal('25000'),
                amount_paid=Decimal('25000'),
                status='PAID',
                notes='Site Visit, 2D Plan, 3D Design & Estimation Work.',
            ),
        )
        if b1_created:
            item1 = BillItem.objects.create(
                bill=bill1,
                description='Site Visit, 2D Plan, 3D Design and Estimation Work',
                quantity=Decimal('1'),
                unit_price=Decimal('25000'),
                amount=Decimal('25000'),
                category=cats.get('Design & Permits'),
                phase=phases.get('Naksa / Design (नक्सा)'),
                account=accts.get('5001'),
            )
            Expense.objects.create(
                project=project,
                title=item1.description,
                amount=item1.amount,
                expense_type='FEES',
                category=item1.category,
                phase=item1.phase,
                funding_source=emergency_cash,
                date=bill1.date_issued,
                is_paid=True,
            )
            try:
                BillService.post_bill_ledger(bill1)
                BillService.pay_bill(
                    bill1, account=accts['1001'], amount=Decimal('25000'),
                    date=date(2026, 2, 27), method='CASH', reference_id='RCPT-SKILL-041',
                )
                emergency_cash.current_balance -= Decimal('25000')
                emergency_cash.save()
            except Exception:
                pass
            self.stdout.write('  ✅ Bill #SKILL-041: Rs. 25,000 (PAID)')

        # Bill 2: Skill Sewa Municipal Drawing — Rs. 75,000 (PAID)
        bill2, b2_created = Bill.objects.get_or_create(
            bill_number='SKILL-RCPT-04',
            defaults=dict(
                project=project,
                date_issued=date(2026, 4, 7),
                due_date=date(2026, 4, 7),
                total_amount=Decimal('75000'),
                amount_paid=Decimal('75000'),
                status='PAID',
                notes='Municipal drawing and documentation.',
            ),
        )
        if b2_created:
            item2 = BillItem.objects.create(
                bill=bill2,
                description='Municipal Drawing, Documentation & Submission',
                quantity=Decimal('1'),
                unit_price=Decimal('75000'),
                amount=Decimal('75000'),
                category=cats.get('Design & Permits'),
                phase=phases.get('Municipal Approval (नक्सा पास)'),
                account=accts.get('5001'),
            )
            Expense.objects.create(
                project=project,
                title=item2.description,
                amount=item2.amount,
                expense_type='FEES',
                category=item2.category,
                phase=item2.phase,
                funding_source=nabil_bank,
                date=bill2.date_issued,
                is_paid=True,
            )
            try:
                BillService.post_bill_ledger(bill2)
                BillService.pay_bill(
                    bill2, account=accts['1002'], amount=Decimal('75000'),
                    date=date(2026, 4, 7), method='BANK_TRANSFER', reference_id='RCPT-SKILL-04',
                )
                nabil_bank.current_balance -= Decimal('75000')
                nabil_bank.save()
            except Exception:
                pass
            self.stdout.write('  ✅ Bill #SKILL-RCPT-04: Rs. 75,000 (PAID)')

        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  9. OPENING BALANCE
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write('💰 Setting Ledger Opening Balances...')
        try:
            FinanceService.post_opening_balance(accts['1001'], Decimal('200000'))
            FinanceService.post_opening_balance(accts['1002'], Decimal('1500000'))
            self.stdout.write('  ✅ Ledger balances synced with Funding Sources.')
        except Exception:
            pass
        self.stdout.write('')

        # ═══════════════════════════════════════════════════════════════════════
        #  SUMMARY
        # ═══════════════════════════════════════════════════════════════════════
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write(self.style.SUCCESS('✅  Jitu & Shristi House Construction — Data Seeded!'))
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write('')
        self.stdout.write(f'  🏠 Project           : {project.name}')
        self.stdout.write(f'  📍 Location          : {project.address}')
        self.stdout.write(f'  💰 Total Budget      : Rs. {project.total_budget:,.0f}')
        self.stdout.write(f'  🔨 Phases            : {ConstructionPhase.objects.filter(project=project).count()}')
        self.stdout.write(f'  🏢 Floors            : {Floor.objects.filter(project=project).count()}')
        self.stdout.write(f'  🚪 Rooms             : {Room.objects.filter(floor__project=project).count()}')
        self.stdout.write(f'  📊 Budget Categories : {BudgetCategory.objects.filter(project=project).count()}')
        self.stdout.write(f'  🗂️  GL Accounts       : {Account.objects.filter(project=project).count()}')
        self.stdout.write(f'  🧾 Bills Recorded    : {Bill.objects.filter(project=project).count()}')
        self.stdout.write(f'  🏢 Suppliers         : {Supplier.objects.filter(project=project).count()}')
        self.stdout.write('')
        self.stdout.write('  Historical payments from Skill Sewa receipts:')
        self.stdout.write('    • Rs. 25,000 — Design Phase 1 (2082-11-14 BS)')
        self.stdout.write('    • Rs. 75,000 — Municipal Drawings (2082-12-24 BS)')
        self.stdout.write('    Total Spent: Rs. 1,00,000')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('━' * 60))
