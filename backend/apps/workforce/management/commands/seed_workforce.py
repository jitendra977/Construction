"""
seed_workforce.py
─────────────────
Populates the database with example categories, roles, and skills so that
the workforce module has a usable starting structure.

Usage:
    python manage.py seed_workforce
    python manage.py seed_workforce --clear   # removes existing data first
"""
from django.core.management.base import BaseCommand
from apps.workforce.models import WorkforceCategory, WorkforceRole, Skill


class Command(BaseCommand):
    help = 'Seed workforce categories, roles and skills.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete all categories, roles and skills before seeding.',
        )

    def handle(self, *args, **options):
        if options['clear']:
            WorkforceRole.objects.all().delete()
            WorkforceCategory.objects.all().delete()
            Skill.objects.all().delete()
            self.stdout.write(self.style.WARNING('Cleared existing categories, roles and skills.'))

        self.stdout.write('Seeding workforce categories, roles and skills…')

        # ── Root categories ───────────────────────────────────────────────────
        labour_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Labour',
            defaults={'icon': 'construction', 'color': '#FF5733', 'order': 1},
        )
        staff_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Staff',
            defaults={'icon': 'badge', 'color': '#3357FF', 'order': 2},
        )

        # ── Sub-categories ────────────────────────────────────────────────────
        civil_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Civil & Structural',
            defaults={'parent': labour_cat, 'color': '#e07b39', 'order': 1},
        )
        mep_cat, _ = WorkforceCategory.objects.get_or_create(
            name='MEP Services',
            defaults={'parent': labour_cat, 'color': '#e0b339', 'order': 2},
        )
        finishing_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Finishing',
            defaults={'parent': labour_cat, 'color': '#39c7e0', 'order': 3},
        )
        mgmt_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Site Management',
            defaults={'parent': staff_cat, 'color': '#3975e0', 'order': 1},
        )
        admin_cat, _ = WorkforceCategory.objects.get_or_create(
            name='Administration',
            defaults={'parent': staff_cat, 'color': '#8b39e0', 'order': 2},
        )

        # ── Roles ─────────────────────────────────────────────────────────────
        # (category, title, code, trade_code, default_wage_type, default_wage_amount)
        roles_data = [
            (civil_cat,    'Lead Mason',                  'MASON_L', 'MASON',       'daily',   900),
            (civil_cat,    'Mason',                       'MASON',   'MASON',       'daily',   800),
            (civil_cat,    'Helper / Jugi',               'HELPER',  'HELPER',      'daily',   600),
            (civil_cat,    'Steel Fixer',                 'LOHARI',  'STEEL_FIXER', 'daily',   750),
            (civil_cat,    'Carpenter',                   'CARP',    'CARPENTER',   'daily',   800),
            (mep_cat,      'Electrician',                 'ELEC',    'ELECTRICIAN', 'daily',   800),
            (mep_cat,      'Plumber',                     'PLUMB',   'PLUMBER',     'daily',   800),
            (finishing_cat,'Painter',                     'PAINT',   'PAINTER',     'daily',   700),
            (finishing_cat,'Tile Setter',                 'TILE',    'TILE_SETTER', 'daily',   750),
            (finishing_cat,'Waterproofing Applicator',    'WATERP',  'WATERPROOF',  'daily',   750),
            (mgmt_cat,     'Site Supervisor',             'SUPV',    'SUPERVISOR',  'daily',  1200),
            (mgmt_cat,     'Site Engineer',               'ENG',     'ENGINEER',    'monthly',55000),
            (mgmt_cat,     'Project Manager',             'PM',      'MANAGER',     'monthly',75000),
            (mgmt_cat,     'Safety Officer',              'SAFE',    'SUPERVISOR',  'monthly',45000),
            (admin_cat,    'Accountant',                  'ACCT',    'ACCOUNTANT',  'monthly',40000),
            (admin_cat,    'Driver',                      'DRVR',    'DRIVER',      'daily',   700),
            (admin_cat,    'Security Guard',              'SEC',     'SECURITY',    'daily',   650),
        ]

        roles_created = 0
        for cat, title, code, trade_code, wage_type, wage_amount in roles_data:
            try:
                _, created = WorkforceRole.objects.get_or_create(
                    code=code,
                    defaults={
                        'category':            cat,
                        'title':               title,
                        'trade_code':          trade_code,
                        'default_wage_type':   wage_type,
                        'default_wage_amount': wage_amount,
                    },
                )
                if created:
                    roles_created += 1
            except Exception:
                # Fallback to category/title if code matches something else or vice versa
                try:
                    _, created = WorkforceRole.objects.get_or_create(
                        category=cat,
                        title=title,
                        defaults={
                            'code':                code,
                            'trade_code':          trade_code,
                            'default_wage_type':   wage_type,
                            'default_wage_amount': wage_amount,
                        },
                    )
                    if created:
                        roles_created += 1
                except Exception:
                    continue

        # ── Skills ────────────────────────────────────────────────────────────
        # NOTE: Skill.TradeType values are LOWERCASE to match model choices.
        skills_data = [
            ('Bricklaying',           'civil'),
            ('Concrete Finishing',    'civil'),
            ('Formwork',              'structural'),
            ('Rebar Tying',           'structural'),
            ('Conduit Installation',  'electrical'),
            ('Panel Wiring',          'electrical'),
            ('Pipe Fitting',          'plumbing'),
            ('Pipe Welding',          'plumbing'),
            ('HVAC Installation',     'hvac'),
            ('Tile Setting',          'finishing'),
            ('Plastering',            'finishing'),
            ('Painting & Coating',    'finishing'),
            ('Waterproofing',         'finishing'),
            ('OSHA 30',               'safety'),
            ('First Aid / CPR',       'safety'),
            ('Scaffolding Safety',    'safety'),
            ('AutoCAD',               'management'),
            ('Project Scheduling',    'management'),
            ('Site Surveying',        'management'),
            ('Crane Operation',       'other'),
            ('Excavator Operation',   'other'),
        ]

        skills_created = 0
        for name, trade_type in skills_data:
            try:
                _, created = Skill.objects.get_or_create(
                    name=name,
                    defaults={'trade_type': trade_type},
                )
                if created:
                    skills_created += 1
            except Exception:
                continue

        self.stdout.write(self.style.SUCCESS(
            f'Done — Roles: {roles_created} new | Skills: {skills_created} new'
        ))
