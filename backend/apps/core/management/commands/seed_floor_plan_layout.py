"""
Seed 2D floor plan layout dimensions (cm) for Radhika Mam house.
Derived from the 4 architectural PDF floor plans.

Building reference:
  Ground Floor (L0) — 970cm × 660cm exterior
  First  Floor (L1) — 1020cm × 625cm exterior
  Second Floor (L2) — 1020cm × 635cm exterior
  Top    Floor (L3) — 970cm × 420cm exterior

All coordinates are from the top-left outer corner of the building.
pos_x / pos_y = room inner top-left offset (cm)
width_cm / depth_cm = room interior footprint (cm)
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Seed 2D floor plan room dimensions and positions"

    def handle(self, *args, **options):
        from apps.core.models import Floor, Room

        # ── FLOOR DIMENSIONS ─────────────────────────────────────────────
        floor_dims = {
            0: dict(plan_width_cm=970,  plan_depth_cm=660),   # Ground
            1: dict(plan_width_cm=1020, plan_depth_cm=625),   # First
            2: dict(plan_width_cm=1020, plan_depth_cm=635),   # Second
            3: dict(plan_width_cm=970,  plan_depth_cm=420),   # Top
        }
        for level, dims in floor_dims.items():
            updated = Floor.objects.filter(level=level).update(**dims)
            self.stdout.write(f"Floor L{level}: {dims}  → {updated} row(s)")

        # ── ROOM LAYOUT DATA ─────────────────────────────────────────────
        # Each entry: (floor_level, room_name_fragment, width_cm, depth_cm, pos_x, pos_y)
        # Derived from architectural PDFs — areas match to within ±2 sqft.
        room_layout = [
            # ── GROUND FLOOR (L0, 970×660) ──────────────────────────────
            # Layout: 2 rows × 3 cols.  Row1 y=0..315, Row2 y=315..660
            # Col1 x=0..420, Col2 x=420..695, Col3 x=695..970
            (0, "Bed Room 1",           420, 315,   0,   0),   # 142 sqft
            (0, "Bed Room 2",           275, 315, 420,   0),   #  93 sqft
            (0, "Staircase & Passage",  275, 270, 695,   0),   #  80 sqft
            (0, "Bed Room 3",           420, 330,   0, 315),   # 149 sqft
            (0, "Kitchen",              275, 267, 420, 315),   #  79 sqft
            (0, "Toilet & Bathroom",    170, 165, 695, 315),   #  30 sqft

            # ── FIRST FLOOR (L1, 1020×625) ──────────────────────────────
            # Col1 x=0..400, Col2 x=400..805, Col3 x=805..1020
            # Row1 y=0..323, Row2 y=323..625
            (1, "Master Bed Room",      400, 323,   0,   0),   # 140 sqft
            (1, "Bed Room",             400, 290,   0, 323),   # 125 sqft
            (1, "Living Room",          405, 315, 400,   0),   # 137 sqft
            (1, "Kitchen & Dining",     405, 190, 400, 315),   #  83 sqft
            (1, "Attached T/B",         215, 156, 805,   0),   #  36 sqft
            (1, "Common Toilet",        215, 107, 805, 156),   #  25 sqft
            (1, "Store",                215,  75, 805, 263),   #  17 sqft
            (1, "Staircase",            215, 150, 805, 338),   #  35 sqft

            # ── SECOND FLOOR (L2, 1020×635) ─────────────────────────────
            # Col1 x=0..400, Col2 x=400..805, Col3 x=805..1020
            # Row1 y=0..310, Row2 y=310..635
            (2, "Bed Room 1",           400, 310,   0,   0),   # 133 sqft
            (2, "Bed Room 2",           400, 322,   0, 310),   # 139 sqft
            (2, "Double Height Hall",   405, 305, 400,   0),   # 133 sqft
            (2, "Office",               405, 237, 400, 305),   # 103 sqft
            (2, "Puja Room",            215, 101, 805,   0),   #  23 sqft
            (2, "C.T/B",               215, 159, 805, 101),   #  37 sqft
            (2, "L. Terrace",           215, 222, 805, 260),   #  51 sqft
            (2, "Staircase",            215, 153, 805, 482),   #  35 sqft

            # ── TOP FLOOR (L3, 970×420) ──────────────────────────────────
            # Col1 x=0..650 (open terrace), Col2 x=650..970
            (3, "Open Terrace",         650, 183,   0,   0),   # 128 sqft
            (3, "L. Terrace",           320, 110, 650,   0),   #  38 sqft
            (3, "Laundry",              320,  57, 650, 110),   #  20 sqft
        ]

        updated_total = 0
        for (level, name_fragment, w, d, px, py) in room_layout:
            floor = Floor.objects.filter(level=level).first()
            if not floor:
                self.stdout.write(self.style.WARNING(f"  Floor L{level} not found — skipping '{name_fragment}'"))
                continue
            # Match on the English part (before " / ")
            key = name_fragment.split(" / ")[0].strip()
            qs = Room.objects.filter(floor=floor, name__icontains=key.split(" ")[0])
            # Try more specific match first
            qs2 = Room.objects.filter(floor=floor, name__icontains=key)
            if qs2.exists():
                qs = qs2
            n = qs.update(width_cm=w, depth_cm=d, pos_x=px, pos_y=py)
            area_sqft = round(w * d / 929.03, 1)
            self.stdout.write(f"  L{level} '{key}': {w}×{d}cm at ({px},{py}) → {area_sqft} sqft  [{n} rows]")
            updated_total += n

        self.stdout.write(self.style.SUCCESS(f"\n✓ Done — {updated_total} rooms updated with plan coordinates"))
