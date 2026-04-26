"""
Management command: seed_structure
Populates Floor and Room data for the Structure module with realistic
Nepali house construction data (4-storey RC frame, Tulsipur, Dang).

All room dimensions derived from architectural PDF floor plans.
Building ref: Ground(970×660cm), First(1020×625cm), Second(1020×635cm), Top(970×420cm)

Usage:
    python manage.py seed_structure                   # seeds first available project
    python manage.py seed_structure --project 3       # specific project id
    python manage.py seed_structure --project 3 --clear   # wipe floors/rooms first
"""
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction


# ── Seed data ────────────────────────────────────────────────────────────────
#
# Format per floor:
#   (floor_name, level, plan_width_cm, plan_depth_cm, rooms_list)
#
# Format per room in rooms_list:
#   (name, width_cm, depth_cm, pos_x, pos_y, status, budget_allocation)
#
# Coordinates: top-left corner of room interior, from building outer top-left.
# All in centimetres.  status: NOT_STARTED / IN_PROGRESS / COMPLETED

FLOORS_DATA = [
    # ── GROUND FLOOR (L0) ────────────────────────────────────────────────────
    # Exterior: 970 × 660 cm  (9.70m × 6.60m)
    # Layout: 2 rows × 3 cols
    #   Col1 x=0..420, Col2 x=420..695, Col3 x=695..970
    #   Row1 y=0..315,  Row2 y=315..660
    (
        'Ground Floor / भूतल', 0, 970, 660,
        [
            # name                          W    D   px   py   status          budget
            ('Bed Room 1 / कोठा १',        420, 315,   0,   0, 'COMPLETED',    180000),
            ('Bed Room 2 / कोठा २',        275, 315, 420,   0, 'COMPLETED',    140000),
            ('Staircase / सिँढी',          275, 270, 695,   0, 'IN_PROGRESS',   60000),
            ('Bed Room 3 / कोठा ३',        420, 330,   0, 315, 'COMPLETED',    150000),
            ('Kitchen / भान्सा',           275, 267, 420, 315, 'IN_PROGRESS',  120000),
            ('Toilet & Bathroom / शौचालय', 170, 165, 695, 315, 'IN_PROGRESS',   75000),
        ],
    ),

    # ── FIRST FLOOR (L1) ─────────────────────────────────────────────────────
    # Exterior: 1020 × 625 cm  (10.20m × 6.25m)
    #   Col1 x=0..400, Col2 x=400..805, Col3 x=805..1020
    #   Row1 y=0..323,  Row2 y=323..625
    (
        'First Floor / पहिलो तल्ला', 1, 1020, 625,
        [
            ('Master Bed Room / ठूलो कोठा', 400, 323,   0,   0, 'IN_PROGRESS',  220000),
            ('Bed Room / सुत्ने कोठा',       400, 290,   0, 323, 'NOT_STARTED',  160000),
            ('Living Room / बैठककोठा',       405, 315, 400,   0, 'NOT_STARTED',  180000),
            ('Kitchen & Dining / भान्सा',    405, 190, 400, 315, 'NOT_STARTED',  130000),
            ('Attached T/B / संलग्न शौचालय', 215, 156, 805,   0, 'NOT_STARTED',   80000),
            ('Common Toilet / साझा शौचालय',  215, 107, 805, 156, 'NOT_STARTED',   65000),
            ('Store / भण्डार',              215,  75, 805, 263, 'NOT_STARTED',   40000),
            ('Staircase / सिँढी',           215, 150, 805, 338, 'NOT_STARTED',   50000),
        ],
    ),

    # ── SECOND FLOOR (L2) ────────────────────────────────────────────────────
    # Exterior: 1020 × 635 cm  (10.20m × 6.35m)
    #   Col1 x=0..400, Col2 x=400..805, Col3 x=805..1020
    #   Row1 y=0..310,  Row2 y=310..635
    (
        'Second Floor / दोस्रो तल्ला', 2, 1020, 635,
        [
            ('Bed Room 1 / कोठा १',         400, 310,   0,   0, 'NOT_STARTED',  155000),
            ('Bed Room 2 / कोठा २',         400, 322,   0, 310, 'NOT_STARTED',  160000),
            ('Double Height Hall / हल',     405, 305, 400,   0, 'NOT_STARTED',  200000),
            ('Office / अफिस',               405, 237, 400, 305, 'NOT_STARTED',  120000),
            ('Puja Room / पूजाकोठा',         215, 101, 805,   0, 'NOT_STARTED',   55000),
            ('Common T/B / शौचालय',         215, 159, 805, 101, 'NOT_STARTED',   70000),
            ('L. Terrace / छत',             215, 222, 805, 260, 'NOT_STARTED',   35000),
            ('Staircase / सिँढी',           215, 153, 805, 482, 'NOT_STARTED',   45000),
        ],
    ),

    # ── TOP FLOOR (L3) ───────────────────────────────────────────────────────
    # Exterior: 970 × 420 cm  (9.70m × 4.20m)
    (
        'Top Floor / छत तल्ला', 3, 970, 420,
        [
            ('Open Terrace / खुला छत',   650, 420,   0,   0, 'NOT_STARTED',   80000),
            ('L. Terrace / छत कुनो',     320, 110, 650,   0, 'NOT_STARTED',   25000),
            ('Laundry / धुलाईकोठा',      320,  57, 650, 110, 'NOT_STARTED',   30000),
            ('Water Tank Room / ट्यांकी', 320, 100, 650, 167, 'NOT_STARTED',   40000),
        ],
    ),
]


class Command(BaseCommand):
    help = 'Seed Floor and Room data for the Structure module'

    def add_arguments(self, parser):
        parser.add_argument(
            '--project', type=int, default=None,
            help='Project ID to seed (default: first available project)',
        )
        parser.add_argument(
            '--clear', action='store_true',
            help='Delete existing floors/rooms for this project before seeding',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.core.models import HouseProject, Floor, Room

        # ── Resolve project ──────────────────────────────────────────────────
        pid = options['project']
        if pid:
            try:
                project = HouseProject.objects.get(pk=pid)
            except HouseProject.DoesNotExist:
                raise CommandError(f'Project with id={pid} does not exist.')
        else:
            project = HouseProject.objects.order_by('pk').first()
            if not project:
                raise CommandError('No projects found. Run seed_jitu_project first.')

        self.stdout.write(self.style.HTTP_INFO(
            f'\n🏗️  Seeding Structure data for project: "{project.name}" (id={project.pk})\n'
        ))

        # ── Optionally clear ─────────────────────────────────────────────────
        if options['clear']:
            deleted_rooms = Room.objects.filter(floor__project=project).delete()[0]
            deleted_floors = Floor.objects.filter(project=project).delete()[0]
            self.stdout.write(
                self.style.WARNING(f'  🗑  Cleared {deleted_floors} floors, {deleted_rooms} rooms\n')
            )

        # ── Seed floors & rooms ──────────────────────────────────────────────
        total_floors = 0
        total_rooms  = 0

        for floor_name, level, plan_w, plan_d, rooms_data in FLOORS_DATA:
            floor, floor_created = Floor.objects.update_or_create(
                project=project,
                level=level,
                defaults=dict(
                    name=floor_name,
                    plan_width_cm=plan_w,
                    plan_depth_cm=plan_d,
                ),
            )
            action = 'Created' if floor_created else 'Updated'
            self.stdout.write(
                f'  🏢 {action} — {floor_name}  ({plan_w}cm × {plan_d}cm, Level {level})'
            )
            total_floors += 1

            for (rname, w, d, px, py, status, budget) in rooms_data:
                area_sqft = round(w * d / 929.03, 2)
                room, room_created = Room.objects.update_or_create(
                    floor=floor,
                    name=rname,
                    defaults=dict(
                        width_cm=w,
                        depth_cm=d,
                        pos_x=px,
                        pos_y=py,
                        area_sqft=area_sqft,
                        status=status,
                        budget_allocation=budget,
                    ),
                )
                status_icon = {'COMPLETED': '✅', 'IN_PROGRESS': '🔄', 'NOT_STARTED': '⬜'}[status]
                self.stdout.write(
                    f'       {status_icon} {rname.split("/")[0].strip():<28} '
                    f'{w}×{d}cm  at ({px},{py})  '
                    f'{area_sqft:.1f} ft²  '
                    f'NPR {budget:,}'
                )
                total_rooms += 1

            self.stdout.write('')

        # ── Also fix any existing floors that are missing the project FK ─────
        fixed = Floor.objects.filter(project__isnull=True, level__in=[0, 1, 2, 3]).update(project=project)
        if fixed:
            self.stdout.write(
                self.style.WARNING(f'  🔧 Also linked {fixed} orphan floor(s) to project {project.pk}')
            )

        # ── Summary ──────────────────────────────────────────────────────────
        floor_count = Floor.objects.filter(project=project).count()
        room_count  = Room.objects.filter(floor__project=project).count()
        done_count  = Room.objects.filter(floor__project=project, status='COMPLETED').count()
        wip_count   = Room.objects.filter(floor__project=project, status='IN_PROGRESS').count()
        budget_total = sum(
            r['budget_allocation']
            for r in Room.objects.filter(floor__project=project).values('budget_allocation')
        )

        self.stdout.write(self.style.SUCCESS('─' * 60))
        self.stdout.write(self.style.SUCCESS(f'✓  Floors  : {floor_count}'))
        self.stdout.write(self.style.SUCCESS(f'✓  Rooms   : {room_count}  ({done_count} completed, {wip_count} in-progress)'))
        self.stdout.write(self.style.SUCCESS(f'✓  Budget  : NPR {budget_total:,}'))
        self.stdout.write(self.style.SUCCESS(
            f'\nRun at:  /dashboard/desktop/structure\n'
        ))
