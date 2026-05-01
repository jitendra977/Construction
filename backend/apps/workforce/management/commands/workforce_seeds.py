"""
workforce_seeds.py
──────────────────
Seeds ALL workforce module models with realistic Nepali construction data.

Covers:
  WorkforceCategory, WorkforceRole, Skill
  WorkforceMember, WageStructure, WorkerContract
  WorkerSkill, EmergencyContact
  WorkerAssignment, PayrollRecord
  WorkerEvaluation, SafetyRecord, PerformanceLog
  Team

Usage:
    python manage.py workforce_seeds
    python manage.py workforce_seeds --clear
    python manage.py workforce_seeds --project <project_id>
    python manage.py workforce_seeds --members-only
"""

import random
from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.workforce.models import (
    WorkforceCategory, WorkforceRole, Skill,
    WorkforceMember, WageStructure, WorkerContract,
    WorkerSkill, WorkerDocument,
    EmergencyContact, SafetyRecord, PerformanceLog,
    WorkerAssignment, PayrollRecord,
    WorkerEvaluation, Team,
)

User = get_user_model()

# ── Realistic Nepali names ────────────────────────────────────────────────────
WORKERS = [
    # (first, last, gender, worker_type, trade_code, daily_rate)
    ('Ram Bahadur',   'Tamang',    'M', 'LABOUR',        'MASON',       800),
    ('Krishna',       'Karki',     'M', 'LABOUR',        'MASON',       800),
    ('Bikram',        'Shrestha',  'M', 'LABOUR',        'HELPER',      600),
    ('Sunita',        'Gurung',    'F', 'LABOUR',        'HELPER',      600),
    ('Anil',          'Rai',       'M', 'LABOUR',        'CARPENTER',   800),
    ('Deepak',        'Magar',     'M', 'LABOUR',        'STEEL_FIXER', 750),
    ('Sita',          'Thapa',     'F', 'LABOUR',        'TILE_SETTER', 750),
    ('Hari Prasad',   'Adhikari',  'M', 'LABOUR',        'ELECTRICIAN', 850),
    ('Gopal',         'Bhandari',  'M', 'LABOUR',        'PLUMBER',     800),
    ('Santosh',       'Limbu',     'M', 'LABOUR',        'PAINTER',     700),
    ('Durga',         'Poudel',    'F', 'STAFF',         'SUPERVISOR',  1200),
    ('Rajesh',        'Khadka',    'M', 'STAFF',         'ENGINEER',    0),    # monthly
    ('Suman',         'Basnet',    'M', 'STAFF',         'ACCOUNTANT',  0),    # monthly
    ('Dil Bahadur',   'Gharti',    'M', 'STAFF',         'SECURITY',    650),
    ('Prakash',       'Subedi',    'M', 'SUBCONTRACTOR', 'CARPENTER',   900),
]

PHONE_PREFIXES = ['984', '985', '986', '981', '982', '980', '977', '976']

def _rand_phone():
    return random.choice(PHONE_PREFIXES) + str(random.randint(1000000, 9999999))

def _rand_dob(min_age=20, max_age=50):
    days = random.randint(min_age * 365, max_age * 365)
    return date.today() - timedelta(days=days)

def _rand_past(days_ago_min=10, days_ago_max=365):
    return date.today() - timedelta(days=random.randint(days_ago_min, days_ago_max))


class Command(BaseCommand):
    help = 'Seed all workforce module models with realistic construction data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Wipe all workforce data before seeding.',
        )
        parser.add_argument(
            '--project', type=str, default=None,
            help='Project ID to attach workers to (defaults to first project).',
        )
        parser.add_argument(
            '--members-only', action='store_true',
            help='Only seed WorkforceMembers — skip payroll, evaluations, etc.',
        )

    # ── Entry point ───────────────────────────────────────────────────────────
    def handle(self, *args, **options):
        from apps.core.models import HouseProject

        if options['clear']:
            self._wipe()

        # ── Resolve project ───────────────────────────────────────────────────
        if options['project']:
            try:
                project = HouseProject.objects.get(pk=options['project'])
            except HouseProject.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Project {options['project']} not found."))
                return
        else:
            project = HouseProject.objects.first()

        if not project:
            self.stderr.write(self.style.ERROR(
                'No project found. Run seed_jitu_project first or pass --project <id>.'
            ))
            return

        admin = User.objects.filter(is_superuser=True).first() or User.objects.first()
        if not admin:
            self.stderr.write(self.style.ERROR('No users found. Run seed_jitu_project first.'))
            return

        self.ok(f'Project: {project.name}')
        self.ok(f'Admin:   {admin.username}')

        # ── Step 1: Categories, Roles, Skills ─────────────────────────────────
        self._step('1', 'Categories, Roles & Skills')
        cats, roles = self._seed_categories_roles()
        skills = self._seed_skills()

        # ── Step 2: Members ───────────────────────────────────────────────────
        self._step('2', 'Workforce Members')
        members = self._seed_members(project, roles, admin)

        if options['members_only']:
            self.ok(f'Members-only mode — done. ({len(members)} members created/updated)')
            return

        # ── Step 3: Wage Structures & Contracts ───────────────────────────────
        self._step('3', 'Wage Structures & Contracts')
        self._seed_wages(members, project, admin)

        # ── Step 4: Worker Skills ─────────────────────────────────────────────
        self._step('4', 'Worker Skills')
        self._seed_worker_skills(members, skills, admin)

        # ── Step 5: Emergency Contacts ────────────────────────────────────────
        self._step('5', 'Emergency Contacts')
        self._seed_emergency_contacts(members)

        # ── Step 6: Assignments ───────────────────────────────────────────────
        self._step('6', 'Worker Assignments')
        self._seed_assignments(members, project, admin)

        # ── Step 7: Payroll Records ───────────────────────────────────────────
        self._step('7', 'Payroll Records')
        self._seed_payroll(members, project, admin)

        # ── Step 8: Evaluations ───────────────────────────────────────────────
        self._step('8', 'Worker Evaluations')
        self._seed_evaluations(members, project, admin)

        # ── Step 9: Safety Records ────────────────────────────────────────────
        self._step('9', 'Safety Records')
        self._seed_safety(members, project, admin)

        # ── Step 10: Performance Logs ─────────────────────────────────────────
        self._step('10', 'Performance Logs')
        self._seed_perf_logs(members, project, admin)

        # ── Step 11: Teams ────────────────────────────────────────────────────
        self._step('11', 'Teams')
        self._seed_teams(members, project, admin)

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('═' * 52))
        self.stdout.write(self.style.SUCCESS('  Workforce seed complete'))
        self.stdout.write(self.style.SUCCESS('═' * 52))
        self.stdout.write(f'  Members      : {WorkforceMember.objects.count()}')
        self.stdout.write(f'  Roles        : {WorkforceRole.objects.count()}')
        self.stdout.write(f'  Skills       : {Skill.objects.count()}')
        self.stdout.write(f'  Contracts    : {WorkerContract.objects.count()}')
        self.stdout.write(f'  Assignments  : {WorkerAssignment.objects.count()}')
        self.stdout.write(f'  Payroll Recs : {PayrollRecord.objects.count()}')
        self.stdout.write(f'  Evaluations  : {WorkerEvaluation.objects.count()}')
        self.stdout.write(f'  Safety Recs  : {SafetyRecord.objects.count()}')
        self.stdout.write(f'  Perf Logs    : {PerformanceLog.objects.count()}')
        self.stdout.write(f'  Teams        : {Team.objects.count()}')
        self.stdout.write(self.style.SUCCESS('═' * 52))

    # ── Helpers ───────────────────────────────────────────────────────────────
    def ok(self, msg):
        self.stdout.write(self.style.SUCCESS(f'  ✓  {msg}'))

    def _step(self, num, label):
        self.stdout.write('')
        self.stdout.write(self.style.WARNING(f'[{num}] {label}'))

    # ── Wipe ──────────────────────────────────────────────────────────────────
    def _wipe(self):
        self.stdout.write(self.style.WARNING('Clearing workforce data…'))
        Team.objects.all().delete()
        PerformanceLog.objects.all().delete()
        SafetyRecord.objects.all().delete()
        WorkerEvaluation.objects.all().delete()
        PayrollRecord.objects.all().delete()
        WorkerAssignment.objects.all().delete()
        EmergencyContact.objects.all().delete()
        WorkerSkill.objects.all().delete()
        WorkerDocument.objects.all().delete()
        WorkerContract.objects.all().delete()
        WageStructure.objects.all().delete()
        WorkforceMember.objects.all().delete()
        WorkforceRole.objects.all().delete()
        WorkforceCategory.objects.all().delete()
        Skill.objects.all().delete()
        self.ok('Cleared.')

    # ── Step 1: Categories, Roles ─────────────────────────────────────────────
    def _seed_categories_roles(self):
        # Root categories
        labour_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Labour', defaults={'icon': 'construction', 'color': '#FF5733', 'order': 1},
        )
        staff_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Staff', defaults={'icon': 'badge', 'color': '#3357FF', 'order': 2},
        )

        # Sub-categories
        civil_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Civil & Structural', defaults={'parent': labour_cat, 'color': '#e07b39', 'order': 1},
        )
        mep_cat, _ = WorkforceCategory.objects.get_or_create(
            name='MEP Services', defaults={'parent': labour_cat, 'color': '#e0b339', 'order': 2},
        )
        finishing_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Finishing', defaults={'parent': labour_cat, 'color': '#39c7e0', 'order': 3},
        )
        mgmt_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Site Management', defaults={'parent': staff_cat, 'color': '#3975e0', 'order': 1},
        )
        admin_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Administration', defaults={'parent': staff_cat, 'color': '#8b39e0', 'order': 2},
        )

        cats = [labour_cat, staff_cat, civil_cat, mep_cat, finishing_cat, mgmt_cat, admin_cat]

        # Roles
        roles_data = [
            (civil_cat,    'Lead Mason',               'MASON_L', 'MASON',       'daily',   900),
            (civil_cat,    'Mason',                    'MASON',   'MASON',       'daily',   800),
            (civil_cat,    'Helper / Jugi',            'HELPER',  'HELPER',      'daily',   600),
            (civil_cat,    'Steel Fixer',              'LOHARI',  'STEEL_FIXER', 'daily',   750),
            (civil_cat,    'Carpenter',                'CARP',    'CARPENTER',   'daily',   800),
            (mep_cat,      'Electrician',              'ELEC',    'ELECTRICIAN', 'daily',   850),
            (mep_cat,      'Plumber',                  'PLUMB',   'PLUMBER',     'daily',   800),
            (finishing_cat,'Painter',                  'PAINT',   'PAINTER',     'daily',   700),
            (finishing_cat,'Tile Setter',              'TILE',    'TILE_SETTER', 'daily',   750),
            (finishing_cat,'Waterproofing Applicator', 'WATERP',  'WATERPROOF',  'daily',   750),
            (mgmt_cat,     'Site Supervisor',          'SUPV',    'SUPERVISOR',  'daily',  1200),
            (mgmt_cat,     'Site Engineer',            'ENG',     'ENGINEER',    'monthly',55000),
            (mgmt_cat,     'Project Manager',          'PM',      'MANAGER',     'monthly',75000),
            (mgmt_cat,     'Safety Officer',           'SAFE',    'SUPERVISOR',  'monthly',45000),
            (admin_cat,    'Accountant',               'ACCT',    'ACCOUNTANT',  'monthly',40000),
            (admin_cat,    'Driver',                   'DRVR',    'DRIVER',      'daily',   700),
            (admin_cat,    'Security Guard',           'SEC',     'SECURITY',    'daily',   650),
        ]

        roles = {}
        created = 0
        for cat, title, code, trade_code, wage_type, wage_amount in roles_data:
            role, is_new = WorkforceRole.objects.get_or_create(
                code=code,
                defaults={
                    'category': cat, 'title': title,
                    'trade_code': trade_code,
                    'default_wage_type': wage_type,
                    'default_wage_amount': wage_amount,
                },
            )
            roles[trade_code] = role
            if is_new:
                created += 1

        self.ok(f'{created} new roles  |  {len(roles)} total mapped')
        return cats, roles

    # ── Step 1b: Skills ───────────────────────────────────────────────────────
    def _seed_skills(self):
        skills_data = [
            ('Bricklaying',         'civil'),
            ('Concrete Finishing',  'civil'),
            ('Formwork',            'structural'),
            ('Rebar Tying',         'structural'),
            ('Conduit Installation','electrical'),
            ('Panel Wiring',        'electrical'),
            ('Pipe Fitting',        'plumbing'),
            ('Pipe Welding',        'plumbing'),
            ('Tile Setting',        'finishing'),
            ('Plastering',          'finishing'),
            ('Painting & Coating',  'finishing'),
            ('Waterproofing',       'finishing'),
            ('OSHA 30',             'safety'),
            ('First Aid / CPR',     'safety'),
            ('Scaffolding Safety',  'safety'),
            ('AutoCAD',             'management'),
            ('Project Scheduling',  'management'),
            ('Crane Operation',     'other'),
        ]
        created = 0
        skills = []
        for name, trade_type in skills_data:
            skill, is_new = Skill.objects.get_or_create(
                name=name, defaults={'trade_type': trade_type},
            )
            skills.append(skill)
            if is_new:
                created += 1
        self.ok(f'{created} new skills  |  {len(skills)} total')
        return skills

    # ── Step 2: Members ───────────────────────────────────────────────────────
    def _seed_members(self, project, roles, admin):
        today = date.today()
        members = []
        created = 0

        for first, last, gender, wtype, trade_code, daily_rate in WORKERS:
            # Find role object; fall back to None
            role = roles.get(trade_code)

            # Determine join date (random within last 2 years)
            join_date = today - timedelta(days=random.randint(30, 730))

            # Check if already exists by name + project
            existing = WorkforceMember.objects.filter(
                _first_name=first, _last_name=last,
                current_project=project,
            ).first()

            if existing:
                members.append(existing)
                continue

            member = WorkforceMember(
                worker_type=wtype,
                role=role,
                status='ACTIVE',
                join_date=join_date,
                current_project=project,
                gender=gender,
                date_of_birth=_rand_dob(),
                nationality='Nepali',
                created_by=admin,
            )
            member.first_name = first
            member.last_name  = last
            member.phone      = _rand_phone()
            member.email      = f'{first.lower().replace(" ", ".")}.{last.lower()}@worker.local'
            member.address    = f'Kathmandu, Nepal'
            member.save()
            members.append(member)
            created += 1

        self.ok(f'{created} new members  |  {len(members)} total')
        return members

    # ── Step 3: Wage Structures & Contracts ───────────────────────────────────
    def _seed_wages(self, members, project, admin):
        wages_created     = 0
        contracts_created = 0

        # Map trade → monthly salary for STAFF
        monthly = {'ENGINEER': 55000, 'ACCOUNTANT': 40000, 'MANAGER': 75000}

        for i, (first, last, gender, wtype, trade_code, daily_rate) in enumerate(WORKERS):
            if i >= len(members):
                break
            member = members[i]

            # WageStructure
            if not WageStructure.objects.filter(worker=member).exists():
                is_monthly = wtype == 'STAFF' and trade_code in monthly
                wage_type  = 'monthly' if is_monthly else 'daily'
                amount     = Decimal(str(monthly.get(trade_code, daily_rate or 700)))
                WageStructure.objects.create(
                    worker=member,
                    effective_from=member.join_date,
                    wage_type=wage_type,
                    base_amount=amount,
                    allowance_food=Decimal('50') if wtype == 'LABOUR' else Decimal('150'),
                    allowance_transport=Decimal('0') if wtype == 'LABOUR' else Decimal('100'),
                    created_by=admin,
                )
                wages_created += 1

            # WorkerContract
            if not WorkerContract.objects.filter(worker=member).exists():
                is_monthly = wtype == 'STAFF' and trade_code in monthly
                ctype  = 'permanent' if wtype == 'STAFF' else ('subcontract' if wtype == 'SUBCONTRACTOR' else 'daily')
                amount = Decimal(str(monthly.get(trade_code, daily_rate or 700)))
                end    = member.join_date + timedelta(days=365) if ctype in ('fixed_term','subcontract','daily') else None
                WorkerContract.objects.create(
                    worker=member,
                    contract_type=ctype,
                    status='active',
                    start_date=member.join_date,
                    end_date=end,
                    wage_type='monthly' if is_monthly else 'daily',
                    wage_amount=amount,
                    project=project,
                    signed_date=member.join_date,
                    created_by=admin,
                )
                contracts_created += 1

        self.ok(f'{wages_created} wage structures  |  {contracts_created} contracts')

    # ── Step 4: Worker Skills ─────────────────────────────────────────────────
    def _seed_worker_skills(self, members, skills, admin):
        # Map trade → relevant skill names
        skill_map = {
            'MASON':       ['Bricklaying', 'Concrete Finishing', 'Plastering'],
            'HELPER':      ['Scaffolding Safety', 'First Aid / CPR'],
            'CARPENTER':   ['Formwork', 'Concrete Finishing'],
            'STEEL_FIXER': ['Rebar Tying', 'Formwork'],
            'ELECTRICIAN': ['Conduit Installation', 'Panel Wiring'],
            'PLUMBER':     ['Pipe Fitting', 'Pipe Welding'],
            'PAINTER':     ['Painting & Coating', 'Plastering'],
            'TILE_SETTER': ['Tile Setting', 'Plastering'],
            'SUPERVISOR':  ['OSHA 30', 'First Aid / CPR', 'Scaffolding Safety'],
            'ENGINEER':    ['AutoCAD', 'Project Scheduling', 'OSHA 30'],
            'ACCOUNTANT':  ['Project Scheduling'],
            'SECURITY':    ['First Aid / CPR'],
        }
        skill_objs  = {s.name: s for s in skills}
        levels      = ['beginner', 'intermediate', 'advanced', 'expert']
        created     = 0

        for i, (first, last, gender, wtype, trade_code, _) in enumerate(WORKERS):
            if i >= len(members):
                break
            member      = members[i]
            skill_names = skill_map.get(trade_code, [])
            yoe_base    = random.randint(1, 8)

            for j, sname in enumerate(skill_names):
                skill = skill_objs.get(sname)
                if not skill:
                    continue
                level = levels[min(j + random.randint(0, 1), 3)]
                _, is_new = WorkerSkill.objects.get_or_create(
                    worker=member, skill=skill,
                    defaults={
                        'level': level,
                        'years_experience': yoe_base - j if yoe_base - j > 0 else 1,
                        'is_certified': random.random() > 0.5 if 'OSHA' in sname or 'First Aid' in sname else False,
                    },
                )
                if is_new:
                    created += 1

        self.ok(f'{created} worker skills assigned')

    # ── Step 5: Emergency Contacts ────────────────────────────────────────────
    def _seed_emergency_contacts(self, members):
        rels  = ['Spouse', 'Parent', 'Sibling', 'Uncle', 'Friend']
        created = 0
        for member in members:
            if EmergencyContact.objects.filter(worker=member).exists():
                continue
            EmergencyContact.objects.create(
                worker=member,
                name=f'{member.last_name} Ji',
                relationship=random.choice(rels),
                phone=_rand_phone(),
                is_primary=True,
            )
            created += 1
        self.ok(f'{created} emergency contacts')

    # ── Step 6: Assignments ───────────────────────────────────────────────────
    def _seed_assignments(self, members, project, admin):
        from apps.core.models import ConstructionPhase
        from apps.tasks.models import Task

        created = 0
        today   = date.today()
        phases  = list(ConstructionPhase.objects.filter(project=project))
        tasks   = list(Task.objects.filter(phase__project=project))

        for member in members:
            assignment = WorkerAssignment.objects.filter(worker=member, project=project).first()
            
            if assignment and assignment.phase and assignment.task:
                continue
                
            start  = member.join_date
            end    = start + timedelta(days=random.randint(90, 365))
            status = 'active' if end >= today else 'completed'

            phase  = random.choice(phases) if phases else None
            # Filter tasks by phase if possible
            phase_tasks = [t for t in tasks if t.phase == phase] if phase else tasks
            task = random.choice(phase_tasks) if phase_tasks else None

            est_days = Decimal(str(random.randint(5, 20)))
            act_days = est_days + Decimal(str(random.uniform(-2, 5))) if status == 'completed' else None

            if assignment:
                # Update existing assignment that's missing phase/task
                assignment.phase = phase
                assignment.task = task
                if not assignment.estimated_hours:
                    assignment.estimated_hours = est_days * 8
                assignment.save()
                created += 1
            else:
                # Create new
                WorkerAssignment.objects.create(
                    worker=member,
                    project=project,
                    phase=phase,
                    task=task,
                    start_date=start,
                    end_date=end if status == 'completed' else None,
                    status=status,
                    estimated_days=est_days,
                    actual_days=act_days,
                    estimated_hours=est_days * 8,
                    actual_hours=act_days * 8 if act_days else 0,
                    assigned_by=admin,
                )
                created += 1
        self.ok(f'{created} assignments created or updated (with phase/task links)')

    # ── Step 7: Payroll Records ───────────────────────────────────────────────
    def _seed_payroll(self, members, project, admin):
        created = 0
        # Seed last 2 completed months
        today  = date.today()
        months = []
        for offset in (2, 1):
            y = today.year
            m = today.month - offset
            if m <= 0:
                m += 12; y -= 1
            period_start = date(y, m, 1)
            import calendar
            last_day = calendar.monthrange(y, m)[1]
            period_end   = date(y, m, last_day)
            months.append((period_start, period_end))

        for member in members:
            for period_start, period_end in months:
                if PayrollRecord.objects.filter(
                    worker=member, period_start=period_start, period_end=period_end
                ).exists():
                    continue

                # Derive pay from wage structure
                wage = WageStructure.objects.filter(worker=member).first()
                if wage:
                    if wage.wage_type == 'monthly':
                        base   = wage.base_amount
                        days_p = Decimal('1')
                    else:
                        days_p    = Decimal(str(random.randint(20, 26)))
                        base   = wage.base_amount * days_p
                else:
                    base   = Decimal('700') * Decimal(str(random.randint(20, 26)))
                    days_p = Decimal('22')

                ot_hours = Decimal(str(random.randint(0, 20)))
                ot_rate  = (wage.base_amount / Decimal('8')) * Decimal('1.5') if wage else Decimal('0')
                ot_pay   = ot_hours * ot_rate
                net      = base + ot_pay - Decimal(str(random.randint(0, 500)))

                rec = PayrollRecord.objects.create(
                    worker=member,
                    project=project,
                    period_start=period_start,
                    period_end=period_end,
                    total_days_present=days_p,
                    total_days_absent=random.randint(0, 4),
                    total_overtime_hours=ot_hours,
                    base_pay=base,
                    overtime_pay=ot_pay,
                    allowances=wage.total_allowances if wage else Decimal('0'),
                    deduction_tax=base * Decimal('0.01'),
                    net_pay=max(net, Decimal('0')),
                    status=random.choice(['approved', 'paid']),
                    paid_date=period_end + timedelta(days=random.randint(1, 7)),
                    payment_method=random.choice(['cash', 'bank', 'mobile_pay']),
                    created_by=admin,
                    approved_by=admin,
                )
                created += 1

        self.ok(f'{created} payroll records  ({len(months)} months × {len(members)} workers)')

    # ── Step 8: Evaluations ───────────────────────────────────────────────────
    def _seed_evaluations(self, members, project, admin):
        created = 0
        recs    = ['rehire', 'conditional', 'promote', 'rehire', 'rehire']
        # Evaluate ~60 % of members
        for member in random.sample(members, k=max(1, int(len(members) * 0.6))):
            eval_date = _rand_past(30, 180)
            if WorkerEvaluation.objects.filter(
                worker=member, project=project, eval_date=eval_date
            ).exists():
                continue
            WorkerEvaluation.objects.create(
                worker=member,
                evaluator=admin,
                project=project,
                eval_date=eval_date,
                score_punctuality=random.randint(3, 5),
                score_quality=random.randint(3, 5),
                score_safety=random.randint(3, 5),
                score_teamwork=random.randint(2, 5),
                score_productivity=random.randint(3, 5),
                attendance_days_present=Decimal(str(random.randint(18, 26))),
                attendance_days_absent=random.randint(0, 4),
                recommendation=random.choice(recs),
                comments='Consistent worker. Good attitude on site.',
                is_shared=random.random() > 0.5,
            )
            created += 1
        self.ok(f'{created} evaluations')

    # ── Step 9: Safety Records ────────────────────────────────────────────────
    def _seed_safety(self, members, project, admin):
        incidents = [
            ('near_miss',    'medium', 'Near miss — scaffolding not secured on 3rd floor'),
            ('minor_injury', 'low',    'Minor hand cut while cutting rebar'),
            ('violation',    'medium', 'No helmet in restricted zone'),
            ('near_miss',    'low',    'Slipped on wet concrete surface'),
            ('property_dmg', 'high',   'Formwork collapsed — no injuries'),
        ]
        created = 0
        sample  = random.sample(members, k=min(5, len(members)))
        for member, (itype, severity, desc) in zip(sample, incidents):
            if SafetyRecord.objects.filter(worker=member, project=project).exists():
                continue
            SafetyRecord.objects.create(
                worker=member,
                project=project,
                incident_type=itype,
                severity=severity,
                status=random.choice(['resolved', 'closed', 'open']),
                incident_date=_rand_past(10, 200),
                description=desc,
                action_taken='Corrective action taken. Worker briefed.',
                reported_by=admin,
            )
            created += 1
        self.ok(f'{created} safety records')

    # ── Step 10: Performance Logs ─────────────────────────────────────────────
    def _seed_perf_logs(self, members, project, admin):
        categories = ['punctuality', 'quality', 'safety', 'teamwork', 'productivity']
        created    = 0
        # 2 logs per member
        for member in members:
            for cat in random.sample(categories, k=2):
                log_date = _rand_past(5, 90)
                if PerformanceLog.objects.filter(worker=member, log_date=log_date, category=cat).exists():
                    continue
                PerformanceLog.objects.create(
                    worker=member,
                    project=project,
                    log_date=log_date,
                    category=cat,
                    rating=random.randint(3, 5),
                    notes='On-site observation by supervisor.',
                    logged_by=admin,
                )
                created += 1
        self.ok(f'{created} performance log entries')

    # ── Step 11: Teams ────────────────────────────────────────────────────────
    def _seed_teams(self, members, project, _admin):
        created = 0

        # Team 1 — Civil (Mason leader + helpers)
        civil_members = [
            m for m in members
            if m.role and m.role.trade_code in ('MASON', 'HELPER', 'STEEL_FIXER', 'CARPENTER')
        ]
        # Team 2 — MEP + Finishing
        mep_members = [
            m for m in members
            if m.role and m.role.trade_code in ('ELECTRICIAN', 'PLUMBER', 'PAINTER', 'TILE_SETTER')
        ]
        # Team 3 — Site Supervision
        mgmt_members = [
            m for m in members
            if m.role and m.role.trade_code in ('SUPERVISOR', 'ENGINEER')
        ]

        teams_to_create = [
            ('Civil Works Team',    civil_members),
            ('MEP & Finishing Team', mep_members),
            ('Site Supervision Team', mgmt_members),
        ]

        for name, team_members in teams_to_create:
            if not team_members:
                continue
            leader = team_members[0]
            rest   = team_members[1:]

            team, is_new = Team.objects.get_or_create(
                name=name, project=project,
                defaults={'leader': leader},
            )
            if is_new:
                created += 1

            # Always ensure members are up to date
            team.members.set(rest)

        self.ok(f'{created} new teams  |  {Team.objects.filter(project=project).count()} total for project')
