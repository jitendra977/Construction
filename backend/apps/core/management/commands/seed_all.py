"""
seed_all.py  —  One-command full database seed for local development
─────────────────────────────────────────────────────────────────────
Usage:
    python manage.py seed_all
    python manage.py seed_all --wipe      # clears everything first (default on fresh db)

What it seeds:
    1. Project, Phases, Floors, Rooms        (seed_jitu_project)
    2. User Guides                           (seed_user_guides)
    3. Workforce Categories, Roles, Skills   (seed_workforce)
    4. Attendance Workers + 30 days records
    5. QR Scan Time Window
    6. resource.Supplier / Material / Equipment / Worker
    7. WorkforceMember (linked to AttendanceWorker)
    8. Teams (uses WorkforceMember as leader — must run after step 7)
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from django.db import transaction
from django.utils import timezone
from datetime import date, timedelta, time
import datetime as dt
from decimal import Decimal
import random


# ── helpers ──────────────────────────────────────────────────────────────────
def _today():
    return timezone.localdate()

def _rand_status(p_present=0.78, p_half=0.08):
    r = random.random()
    if r < p_present:      return 'PRESENT'
    elif r < p_present + p_half: return 'HALF_DAY'
    elif r < p_present + p_half + 0.04: return 'LEAVE'
    return 'ABSENT'

def _checkin():
    h = random.randint(7, 9)
    m = random.choice([0, 15, 30, 45])
    return time(h, m)

def _checkout():
    h = random.randint(16, 18)
    m = random.choice([0, 15, 30, 45])
    return time(h, m)


class Command(BaseCommand):
    help = 'Full first-time seed: project, attendance, resources, teams, workforce.'

    def add_arguments(self, parser):
        parser.add_argument('--skip-guides', action='store_true',
                            help='Skip seeding user guides (faster)')

    def log(self, msg):
        self.stdout.write(msg)

    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS(f'  ✅  {msg}'))

    def section(self, title):
        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING(f'── {title} ──'))

    # ─────────────────────────────────────────────────────────────────────────
    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(42)   # reproducible data

        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write(self.style.SUCCESS('  🏗   HCMS — Full Seed'))
        self.stdout.write(self.style.SUCCESS('━' * 60))

        # ── 0. Wipe everything ───────────────────────────────────────────────
        # Always wipe so re-runs are clean. --wipe is just kept for explicit clarity.
        self._wipe_all()

        # ── 1. Core project (phases, floors, rooms, finance) ─────────────────
        self.section('1 / 8  Project + Phases + Floors + Finance')
        try:
            call_command('seed_jitu_project', wipe=True, verbosity=0)
            self.ok('seed_jitu_project done')
        except Exception as e:
            import traceback
            self.stdout.write(self.style.WARNING(f'  ⚠  seed_jitu_project: {e}'))
            self.stdout.write(traceback.format_exc())

        from apps.core.models import HouseProject
        project = HouseProject.objects.first()
        if not project:
            self.stdout.write(self.style.ERROR('No project found — aborting.'))
            return

        # ── 2. User guides ────────────────────────────────────────────────────
        if not options['skip_guides']:
            self.section('2 / 8  User Guides')
            try:
                call_command('seed_user_guides', verbosity=0)
                self.ok('seed_user_guides done')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'  ⚠  seed_user_guides: {e}'))

        # ── 3. Workforce categories / roles / skills ──────────────────────────
        self.section('3 / 8  Workforce Categories, Roles & Skills')
        try:
            call_command('seed_workforce', verbosity=0)
            self.ok('seed_workforce done')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'  ⚠  seed_workforce: {e}'))

        # ── 4. Attendance workers + 30-day records ────────────────────────────
        self.section('4 / 8  Attendance Workers + 30-Day Records')
        self._seed_attendance(project)

        # ── 5. QR Scan Time Window ────────────────────────────────────────────
        self.section('5 / 8  QR Scan Time Window')
        self._seed_scan_window(project)

        # ── 6. Resource: Suppliers, Materials, Equipment, Workers ─────────────
        self.section('6 / 8  Resource Module')
        self._seed_resources(project)

        # ── 7. WorkforceMember (link to AttendanceWorkers) ────────────────────
        self.section('7 / 8  Workforce Members')
        self._seed_workforce_members(project)

        # ── 8. Teams (must run after workforce members exist) ─────────────────
        self.section('8 / 8  Teams')
        self._seed_teams(project)

        # ── Summary ───────────────────────────────────────────────────────────
        self._print_summary(project)

    # ═════════════════════════════════════════════════════════════════════════
    #  WIPE
    # ═════════════════════════════════════════════════════════════════════════
    def _wipe_all(self):
        self.section('Wiping existing data')

        # Import every model in reverse dependency order
        # (children before parents, to avoid FK constraint errors)
        wipe_order = []

        try:
            from apps.workforce.models import (
                PayrollRecord, PerformanceLog, SafetyRecord, WorkerEvaluation,
                WorkerAssignment, WorkerContract, WageStructure, Team,
                WorkforceMember, WorkforceRole, WorkforceCategory, Skill,
            )
            wipe_order += [
                PayrollRecord, PerformanceLog, SafetyRecord, WorkerEvaluation,
                WorkerAssignment, WorkerContract, WageStructure, Team,
                WorkforceMember, WorkforceRole, WorkforceCategory, Skill,
            ]
        except Exception:
            pass

        try:
            from apps.attendance.models import (
                QRScanLog, DailyAttendance, AttendanceWorker,
                ScanTimeWindow, ProjectHoliday, ProjectAttendanceSettings,
            )
            wipe_order += [
                QRScanLog, DailyAttendance, AttendanceWorker,
                ScanTimeWindow, ProjectHoliday, ProjectAttendanceSettings,
            ]
        except Exception:
            pass

        try:
            from apps.resource.models import (
                StockMovement, PurchaseOrder as RPO, Worker as RWorker,
                Equipment, Material, Supplier as RSupplier,
            )
            wipe_order += [StockMovement, RPO, RWorker, Equipment, Material, RSupplier]
        except Exception:
            pass

        # Finance & accounting (children first)
        try:
            from apps.finance.models import (
                BillPayment, BillItem, Bill, Payment, Expense,
                FundingTransaction, FundingSource, JournalLine, JournalEntry,
                Account, BankTransfer, PurchaseOrder as FPO,
                PhaseBudgetAllocation, BudgetCategory,
            )
            wipe_order += [
                BillPayment, BillItem, Bill, Payment, Expense,
                FundingTransaction, FundingSource, JournalLine, JournalEntry,
                BankTransfer, FPO, PhaseBudgetAllocation, BudgetCategory, Account,
            ]
        except Exception:
            pass

        try:
            from apps.resources.models import Supplier as OldSupplier, Material as OldMat
            wipe_order += [OldSupplier, OldMat]
        except Exception:
            pass

        # Core project models (last — they're parents of everything)
        try:
            from apps.core.models import Room, Floor, ConstructionPhase, ProjectMember, HouseProject
            wipe_order += [Room, Floor, ConstructionPhase, ProjectMember, HouseProject]
        except Exception:
            pass

        for Model in wipe_order:
            try:
                count = Model.objects.count()
                if count:
                    Model.objects.all().delete()
                    self.log(f'    deleted {count} × {Model.__name__}')
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'    skip {Model.__name__}: {e}'))

        self.ok('Wipe complete')

    # ═════════════════════════════════════════════════════════════════════════
    #  ATTENDANCE
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_attendance(self, project):
        from apps.attendance.models import AttendanceWorker, DailyAttendance, QRScanLog
        from django.utils import timezone as tz

        # Standard shift: 08:00 – 17:00  (9h − 1h lunch = 8h working)
        SHIFT_START   = time(8,  0)
        SHIFT_END     = time(17, 0)
        LATE_AFTER    = time(8, 30)   # check-in after 08:30 = late

        workers_data = [
            # (name, trade, worker_type, daily_rate, phone)
            ('Ram Bahadur Tamang',   'MASON',       'LABOUR', 900,   '9841-111111'),
            ('Shyam Prasad Khadka',  'MASON',       'LABOUR', 850,   '9841-222222'),
            ('Hari Lal Magar',       'HELPER',      'LABOUR', 650,   '9841-333333'),
            ('Sita Kumari Thapa',    'HELPER',      'LABOUR', 600,   '9841-444444'),
            ('Bikram Gurung',        'CARPENTER',   'LABOUR', 850,   '9841-555555'),
            ('Dipak Rai',            'CARPENTER',   'LABOUR', 800,   '9841-666666'),
            ('Sunil Bishwokarma',    'STEEL_FIXER', 'LABOUR', 800,   '9841-777777'),
            ('Ganesh Lama',          'ELECTRICIAN', 'LABOUR', 850,   '9841-888888'),
            ('Pratap Shrestha',      'PLUMBER',     'LABOUR', 800,   '9841-999999'),
            ('Binod Chaudhary',      'PAINTER',     'LABOUR', 750,   '9841-101010'),
            ('Manoj Karki',          'TILE_SETTER', 'LABOUR', 800,   '9841-121212'),
            ('Anil Kumar Yadav',     'HELPER',      'LABOUR', 600,   '9841-131313'),
            ('Rajesh Adhikari',      'SUPERVISOR',  'STAFF',  1400,  '9841-141414'),
            ('Sunita Bhandari',      'OTHER',       'STAFF',  45000, '9841-151515'),
        ]

        today = _today()
        workers = []
        for name, trade, wtype, rate, phone in workers_data:
            worker, created = AttendanceWorker.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    trade=trade,
                    worker_type=wtype,
                    daily_rate=Decimal(str(rate)),
                    phone=phone,
                ),
            )
            workers.append(worker)
            if created:
                self.log(f'    + {name} ({trade})')

        self.ok(f'{len(workers)} attendance workers')

        # ── 30 days of attendance + QR scan logs ─────────────────────────────
        att_count  = 0
        scan_count = 0

        for day_offset in range(30, 0, -1):
            day = today - timedelta(days=day_offset)
            dow = day.weekday()          # 0=Mon … 6=Sun
            is_weekend = (dow == 5)      # Saturday off in Nepal

            for worker in workers:
                if is_weekend:
                    status     = 'HOLIDAY'
                    ci = co    = None
                    ot_hours   = Decimal('0')
                else:
                    status   = _rand_status()
                    ci       = _checkin()  if status in ('PRESENT', 'HALF_DAY') else None
                    co       = _checkout() if status == 'PRESENT'               else None

                    # ── Overtime: minutes worked past 17:00 ───────────────────
                    if co and co > SHIFT_END:
                        shift_end_min = SHIFT_END.hour * 60 + SHIFT_END.minute
                        co_min        = co.hour       * 60 + co.minute
                        ot_hours = Decimal(str(round((co_min - shift_end_min) / 60, 2)))
                    else:
                        ot_hours = Decimal('0')

                att, created = DailyAttendance.objects.get_or_create(
                    worker=worker, date=day,
                    defaults=dict(
                        project=project,
                        status=status,
                        check_in=ci,
                        check_out=co,
                        overtime_hours=ot_hours,
                        daily_rate_snapshot=worker.daily_rate,
                        overtime_rate_snapshot=worker.effective_overtime_rate(),
                    ),
                )

                if created:
                    att_count += 1

                    # ── QR scan log: check-in ─────────────────────────────────
                    if ci:
                        ci_dt   = tz.make_aware(dt.datetime.combine(day, ci))
                        is_late = ci > LATE_AFTER
                        QRScanLog.objects.create(
                            worker=worker,
                            attendance=att,
                            scan_type='CHECK_IN',
                            scan_status='VALID',
                            is_late=is_late,
                            scanned_at=ci_dt,
                        )
                        scan_count += 1

                    # ── QR scan log: check-out ────────────────────────────────
                    if co:
                        co_dt    = tz.make_aware(dt.datetime.combine(day, co))
                        is_early = co < SHIFT_END
                        QRScanLog.objects.create(
                            worker=worker,
                            attendance=att,
                            scan_type='CHECK_OUT',
                            scan_status='VALID',
                            is_early=is_early,
                            scanned_at=co_dt,
                        )
                        scan_count += 1

        self.ok(f'{att_count} daily attendance records (30 days)')
        self.ok(f'{scan_count} QR scan log entries (check-in + check-out)')

    # ═════════════════════════════════════════════════════════════════════════
    #  SCAN TIME WINDOW
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_scan_window(self, project):
        from apps.attendance.models import ScanTimeWindow
        sw, created = ScanTimeWindow.objects.get_or_create(
            project=project,
            defaults=dict(
                checkin_start=time(7, 0),
                checkin_end=time(10, 0),
                checkout_start=time(16, 0),
                checkout_end=time(19, 0),
                is_active=True,
                late_threshold_minutes=30,
                early_checkout_minutes=30,
            ),
        )
        self.ok('Scan time window ' + ('created' if created else 'already exists'))

    # ═════════════════════════════════════════════════════════════════════════
    #  RESOURCES
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_resources(self, project):
        from apps.resource.models import Supplier, Material, Equipment, Worker as RWorker

        # ── Suppliers ────────────────────────────────────────────────────────
        suppliers_data = [
            ('Bhatbhateni Hardware',    'Ram Sharma',      '01-4222333', 'Materials',  'Balaju, Kathmandu'),
            ('Pashupati Steel Depot',   'Krishna Karki',   '01-4111222', 'Materials',  'Kalanki, Kathmandu'),
            ('Nepal Sand & Aggregate',  'Babu Thapa',      '9851-001001', 'Materials', 'Banepa, Kavre'),
            ('Kathmandu Timber Mart',   'Hari Bahadur',    '9851-002002', 'Materials', 'Kalimati, Kathmandu'),
            ('Pragati Electrical Store','Suresh Shrestha', '9841-003003', 'Materials',  'New Baneshwor'),
            ('Himalayan Plumbing Hub',  'Sita Karmacharya','9841-004004', 'Materials',  'Putalisadak'),
            ('Site Tools Rental',       'Gopal Bhatta',    '9841-005005', 'Equipment', 'Gongabu, Kathmandu'),
            ('Dang Brick Factory',      'Mahesh Buda',     '9848-006006', 'Materials',  'Tulsipur, Dang'),
        ]
        suppliers = {}
        for name, contact, phone, specialty, address in suppliers_data:
            s, _ = Supplier.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    contact_person=contact,
                    phone=phone,
                    specialty=specialty,
                    address=address,
                    is_active=True,
                ),
            )
            suppliers[name] = s
        self.ok(f'{len(suppliers)} suppliers')

        # ── Materials ────────────────────────────────────────────────────────
        materials_data = [
            # (name, category, unit, unit_price, stock_qty, reorder_level, supplier_key)
            ('Cement (OPC 43)',           'CEMENT',    'BAG',      950,   200,  50, 'Bhatbhateni Hardware'),
            ('TMT Steel 12mm',            'STEEL',     'KG',       105,  5000, 500, 'Pashupati Steel Depot'),
            ('TMT Steel 16mm',            'STEEL',     'KG',       107,  3000, 300, 'Pashupati Steel Depot'),
            ('TMT Steel 8mm',             'STEEL',     'KG',       103,  1500, 200, 'Pashupati Steel Depot'),
            ('River Sand (Balu)',          'SAND',      'CU_METER', 3500,   30,   5, 'Nepal Sand & Aggregate'),
            ('Stone Aggregate 20mm',      'AGGREGATE', 'CU_METER', 4000,   25,   5, 'Nepal Sand & Aggregate'),
            ('Stone Aggregate 40mm',      'AGGREGATE', 'CU_METER', 3800,   20,   5, 'Nepal Sand & Aggregate'),
            ('Rato Brick (Machine)',       'BRICK',     'PIECE',       12, 5000, 500, 'Dang Brick Factory'),
            ('Sal Wood Timber 4×4',       'WOOD',      'PIECE',     2800,   80,  10, 'Kathmandu Timber Mart'),
            ('Plywood 12mm',              'WOOD',      'PIECE',     2200,   40,  10, 'Kathmandu Timber Mart'),
            ('PVC Pipe 4" (SWR)',          'PLUMBING',  'PIECE',     680,    30,   5, 'Himalayan Plumbing Hub'),
            ('GI Pipe 1"',                'PLUMBING',  'PIECE',     450,    20,   5, 'Himalayan Plumbing Hub'),
            ('MS Binding Wire',           'STEEL',     'KG',        130,   200,  20, 'Pashupati Steel Depot'),
            ('Electrical Conduit 20mm',   'ELECTRICAL','PIECE',     120,    50,  10, 'Pragati Electrical Store'),
            ('MCB 32A',                   'ELECTRICAL','PIECE',     350,    20,   5, 'Pragati Electrical Store'),
            ('Shuttering Oil',            'OTHER',     'LITER',     180,    50,  10, 'Bhatbhateni Hardware'),
            ('Curing Compound',           'OTHER',     'LITER',     220,    20,   5, 'Bhatbhateni Hardware'),
            ('Waterproofing Chemical',    'OTHER',     'KG',        280,    30,   5, 'Bhatbhateni Hardware'),
        ]
        mat_count = 0
        for name, cat, unit, price, stock, reorder, sup_key in materials_data:
            _, created = Material.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    category=cat,
                    unit=unit,
                    unit_price=Decimal(str(price)),
                    stock_qty=Decimal(str(stock)),
                    reorder_level=Decimal(str(reorder)),
                    is_active=True,
                ),
            )
            if created:
                mat_count += 1
        self.ok(f'{mat_count} new materials')

        # ── Equipment ────────────────────────────────────────────────────────
        equipment_data = [
            # (name, type, status, daily_rate, qty)
            ('Concrete Mixer (350L)',       'HEAVY',   'IN_USE',    2500, 1),
            ('Bar Bending Machine',        'HEAVY',   'IN_USE',    1500, 1),
            ('Vibrator (Needle)',           'LIGHT',   'AVAILABLE', 800,  2),
            ('Scaffolding Set (per floor)', 'LIGHT',   'IN_USE',    3000, 2),
            ('Excavator (JCB)',             'HEAVY',   'AVAILABLE', 15000,1),
            ('Water Pump 1.5HP',            'LIGHT',   'AVAILABLE', 600,  1),
            ('Angle Grinder',              'TOOL',    'AVAILABLE', 400,  2),
            ('Circular Saw',               'TOOL',    'AVAILABLE', 500,  1),
            ('Spirit Level (2m)',           'TOOL',    'AVAILABLE', 0,    3),
            ('Plumb Bob & Line',           'TOOL',    'AVAILABLE', 0,    5),
            ('Site Pickup Truck',           'VEHICLE', 'AVAILABLE', 5000, 1),
        ]
        eq_count = 0
        for name, etype, status, rate, qty in equipment_data:
            _, created = Equipment.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    equipment_type=etype,
                    status=status,
                    daily_rate=Decimal(str(rate)),
                    quantity=qty,
                    is_active=True,
                ),
            )
            if created:
                eq_count += 1
        self.ok(f'{eq_count} new equipment items')

        # ── Resource Workers ─────────────────────────────────────────────────
        rworkers_data = [
            ('Ram Bahadur Tamang',  'MASON',       900,  '9841-111111'),
            ('Bikram Gurung',       'CARPENTER',   850,  '9841-555555'),
            ('Sunil Bishwokarma',   'MASON',       800,  '9841-777777'),
            ('Ganesh Lama',         'ELECTRICIAN', 850,  '9841-888888'),
            ('Pratap Shrestha',     'PLUMBER',     800,  '9841-999999'),
            ('Binod Chaudhary',     'PAINTER',     750,  '9841-101010'),
            ('Rajesh Adhikari',     'SUPERVISOR',  1400, '9841-141414'),
            ('Hari Lal Magar',      'LABORER',     650,  '9841-333333'),
            ('Anil Kumar Yadav',    'LABORER',     600,  '9841-131313'),
            ('Manoj Karki',         'OTHER',       800,  '9841-121212'),
        ]
        rw_count = 0
        for name, role, wage, phone in rworkers_data:
            _, created = RWorker.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    role=role,
                    daily_wage=Decimal(str(wage)),
                    phone=phone,
                    is_active=True,
                    joined_date=_today() - timedelta(days=random.randint(10, 60)),
                ),
            )
            if created:
                rw_count += 1
        self.ok(f'{rw_count} new resource workers')

    # ═════════════════════════════════════════════════════════════════════════
    #  TEAMS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_teams(self, project):
        from apps.workforce.models import Team, WorkforceMember

        # Use the supervisor-linked WorkforceMember as leader; fall back to any member
        leader = (
            WorkforceMember.objects.filter(
                current_project=project,
                attendance_worker__trade='SUPERVISOR',
            ).first()
            or WorkforceMember.objects.filter(current_project=project).first()
        )

        teams_data = [
            ('Civil Team',      'Masonry, concrete, and structural work'),
            ('MEP Team',        'Mechanical, electrical, and plumbing'),
            ('Finishing Team',  'Painting, tiling, and interior finishing'),
            ('Site Management', 'Supervision, planning, and coordination'),
        ]
        count = 0
        for name, desc in teams_data:
            _, created = Team.objects.get_or_create(
                project=project, name=name,
                defaults=dict(description=desc, leader=leader, is_active=True),
            )
            if created:
                count += 1
        self.ok(f'{count} new teams')

    # ═════════════════════════════════════════════════════════════════════════
    #  WORKFORCE MEMBERS
    # ═════════════════════════════════════════════════════════════════════════
    def _seed_workforce_members(self, project):
        from apps.workforce.models import WorkforceMember, WorkforceRole, WageStructure
        from apps.attendance.models import AttendanceWorker

        # Map attendance trade → workforce role code
        trade_to_role_code = {
            'MASON':       'MASON',
            'HELPER':      'HELPER',
            'CARPENTER':   'CARP',
            'STEEL_FIXER': 'LOHARI',
            'ELECTRICIAN': 'ELEC',
            'PLUMBER':     'PLUMB',
            'PAINTER':     'PAINT',
            'TILE_SETTER': 'TILE',
            'SUPERVISOR':  'SUPV',
            'OTHER':       None,
        }

        roles_by_code = {r.code: r for r in WorkforceRole.objects.all()}
        workers = AttendanceWorker.objects.filter(project=project)
        created_count = 0

        for worker in workers:
            # Skip if already linked
            if WorkforceMember.objects.filter(attendance_worker=worker).exists():
                continue

            name_parts = worker.name.strip().rsplit(' ', 1)
            first = name_parts[0]
            last  = name_parts[1] if len(name_parts) > 1 else ''

            role_code = trade_to_role_code.get(worker.trade)
            role = roles_by_code.get(role_code) if role_code else None

            join_dt = _today() - timedelta(days=random.randint(10, 60))

            member, created = WorkforceMember.objects.get_or_create(
                attendance_worker=worker,
                defaults=dict(
                    _first_name=first,
                    _last_name=last,
                    role=role,
                    status='ACTIVE',
                    worker_type=worker.worker_type,
                    _phone=worker.phone,
                    current_project=project,
                    join_date=join_dt,
                ),
            )
            if created:
                # Create wage structure
                WageStructure.objects.get_or_create(
                    worker=member,
                    defaults=dict(
                        wage_type='daily' if worker.worker_type == 'LABOUR' else 'monthly',
                        base_amount=worker.daily_rate,
                        currency='NPR',
                        effective_from=join_dt,
                    ),
                )
                created_count += 1

        self.ok(f'{created_count} new workforce members created & linked')

    # ═════════════════════════════════════════════════════════════════════════
    #  SUMMARY
    # ═════════════════════════════════════════════════════════════════════════
    def _print_summary(self, project):
        from apps.core.models import ConstructionPhase, Floor, Room
        from apps.finance.models import BudgetCategory, Expense
        from apps.attendance.models import AttendanceWorker, DailyAttendance, QRScanLog
        from apps.resource.models import Material, Equipment, Supplier, Worker as RWorker
        from apps.workforce.models import Team, WorkforceMember, WorkforceRole, WorkforceCategory
        from apps.workforce.models import Skill

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write(self.style.SUCCESS('  ✅  Full Seed Complete'))
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write('')
        rows = [
            ('🏠 Project',               project.name),
            ('📍 Location',              project.address),
            ('💰 Budget',                f'Rs. {project.total_budget:,.0f}'),
            ('🔨 Phases',                ConstructionPhase.objects.count()),
            ('🏢 Floors',                Floor.objects.count()),
            ('🚪 Rooms',                 Room.objects.count()),
            ('📊 Budget Categories',     BudgetCategory.objects.count()),
            ('💸 Expenses',              Expense.objects.count()),
            ('👷 Attendance Workers',    AttendanceWorker.objects.count()),
            ('📅 Daily Attendance Rows', DailyAttendance.objects.count()),
            ('📲 QR Scan Logs',          QRScanLog.objects.count()),
            ('🏭 Resource Suppliers',    Supplier.objects.count()),
            ('🧱 Materials',             Material.objects.count()),
            ('🔧 Equipment',             Equipment.objects.count()),
            ('👥 Resource Workers',      RWorker.objects.count()),
            ('🤝 Teams',                 Team.objects.count()),
            ('🗂  WF Categories',        WorkforceCategory.objects.count()),
            ('🎭 WF Roles',              WorkforceRole.objects.count()),
            ('🛠  WF Skills',            Skill.objects.count()),
            ('🪪 Workforce Members',     WorkforceMember.objects.count()),
        ]
        for label, value in rows:
            self.stdout.write(f'  {label:<28} {value}')
        self.stdout.write('')
        self.stdout.write('  Admin login: admin@gmail.com / adminpass')
        self.stdout.write(self.style.SUCCESS('━' * 60))
        self.stdout.write('')
