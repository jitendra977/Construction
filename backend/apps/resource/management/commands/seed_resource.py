"""
Management command: seed_resource
Populates the Resource module with realistic Nepali construction data.

Usage:
    python manage.py seed_resource                  # seeds project id=3
    python manage.py seed_resource --project 4      # seeds a specific project
    python manage.py seed_resource --clear          # wipe existing data first
    python manage.py seed_resource --project 4 --clear
"""
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
import datetime, random

from apps.core.models import HouseProject
from apps.resource.models.material   import Material
from apps.resource.models.equipment  import Equipment
from apps.resource.models.labor      import Worker, WorkerAttendance
from apps.resource.models.supplier   import Supplier
from apps.resource.models.purchase   import PurchaseOrder, PurchaseOrderItem, StockMovement


# ── Seed data ────────────────────────────────────────────────────────────────

MATERIALS = [
    # (name, category, unit, unit_price, stock_qty, reorder_level, description)
    # CEMENT
    ("OPC Cement (Hetauda)",   "CEMENT",    "BAG",      "850.00",  "120",  "50",  "Ordinary Portland Cement 50kg bag — Hetauda Cement"),
    ("PPC Cement (Udayapur)",  "CEMENT",    "BAG",      "820.00",   "80",  "40",  "Pozzolana Portland Cement — Udayapur Cement Factory"),
    # STEEL
    ("Steel Rebar 8mm (TMT)",  "STEEL",     "KG",        "95.00",  "850", "200",  "TMT 8mm rebar — Fe500 grade"),
    ("Steel Rebar 10mm (TMT)", "STEEL",     "KG",        "93.00", "1200", "300",  "TMT 10mm rebar — Fe500 grade"),
    ("Steel Rebar 12mm (TMT)", "STEEL",     "KG",        "92.00",  "950", "300",  "TMT 12mm rebar — Fe500 grade"),
    ("Steel Rebar 16mm (TMT)", "STEEL",     "KG",        "91.00",  "600", "200",  "TMT 16mm rebar — Fe500 grade"),
    ("Binding Wire",           "STEEL",     "KG",        "75.00",   "45",  "20",  "Annealed binding wire 18 gauge"),
    # SAND
    ("River Sand (Fine)",      "SAND",      "CU_METER", "2800.00",  "25",   "8",  "Fine river sand for plastering"),
    ("River Sand (Coarse)",    "SAND",      "CU_METER", "2600.00",  "30",   "8",  "Coarse river sand for concrete"),
    # AGGREGATE
    ("Stone Aggregate 20mm",   "AGGREGATE", "CU_METER", "3200.00",  "20",   "6",  "Crushed stone aggregate 20mm — for concrete mix"),
    ("Stone Aggregate 40mm",   "AGGREGATE", "CU_METER", "3000.00",  "15",   "5",  "Crushed stone aggregate 40mm — for PCC"),
    ("Stone Dust",             "AGGREGATE", "CU_METER", "1800.00",  "12",   "4",  "Stone dust for brick masonry mortar"),
    # BRICK
    ("Brick (Machine Pressed)", "BRICK",    "PIECE",      "18.00", "8500","2000", "Machine pressed brick 230x110x75mm"),
    ("Hollow Block 6inch",     "BRICK",     "PIECE",      "65.00",  "500", "200", "6-inch hollow concrete block"),
    ("Hollow Block 4inch",     "BRICK",     "PIECE",      "45.00",  "300", "150", "4-inch hollow concrete block for partition"),
    # WOOD
    ("Sal Wood Timber",        "WOOD",      "CU_METER","28000.00",    "3",   "1", "Sal wood for formwork and shuttering"),
    ("Plywood 18mm",           "WOOD",      "PIECE",    "3200.00",   "25",  "10", "18mm BWP grade plywood for formwork"),
    ("Plywood 12mm",           "WOOD",      "PIECE",    "2200.00",   "18",   "8", "12mm plywood for shuttering"),
    ("Bamboo Poles",           "WOOD",      "PIECE",     "120.00",   "80",  "30", "Bamboo poles for scaffolding"),
    # ELECTRICAL
    ("PVC Wire 1.5mm (100m)",  "ELECTRICAL","PIECE",    "3500.00",   "12",   "4", "1.5mm PVC insulated copper wire — 100m roll"),
    ("PVC Wire 2.5mm (100m)",  "ELECTRICAL","PIECE",    "5500.00",    "8",   "3", "2.5mm PVC insulated copper wire — 100m roll"),
    ("MCB 32A Single Pole",    "ELECTRICAL","PIECE",     "450.00",   "20",   "8", "Miniature circuit breaker 32A SP"),
    ("Distribution Board 8way","ELECTRICAL","PIECE",    "3200.00",    "3",   "1", "8-way distribution board with main switch"),
    ("Conduit Pipe 20mm",      "ELECTRICAL","METER",      "45.00",  "150",  "50", "PVC conduit pipe 20mm"),
    ("Switch Socket Combo",    "ELECTRICAL","PIECE",     "280.00",   "30",  "10", "Modular switch+socket combo 6A"),
    # PLUMBING
    ("CPVC Pipe 1/2 inch",     "PLUMBING",  "METER",     "120.00",   "80",  "30", "CPVC hot/cold water pipe 1/2 inch"),
    ("CPVC Pipe 3/4 inch",     "PLUMBING",  "METER",     "180.00",   "50",  "20", "CPVC pipe 3/4 inch"),
    ("UPVC Pipe 4 inch",       "PLUMBING",  "METER",     "320.00",   "40",  "15", "UPVC drainage pipe 4 inch"),
    ("UPVC Pipe 2 inch",       "PLUMBING",  "METER",     "180.00",   "35",  "10", "UPVC drainage pipe 2 inch"),
    ("Ball Valve 1/2 inch",    "PLUMBING",  "PIECE",     "350.00",   "15",   "5", "Brass ball valve 1/2 inch"),
    ("Toilet Suite (EWC)",     "PLUMBING",  "PIECE",    "8500.00",    "2",   "1", "European water closet — white vitreous china"),
    ("Wash Basin",             "PLUMBING",  "PIECE",    "4500.00",    "3",   "1", "White ceramic wash basin with pillar tap"),
    # OTHER
    ("Waterproofing Chemical", "OTHER",     "LITER",     "650.00",   "30",  "10", "Crystalline waterproofing compound"),
    ("Tile Adhesive 20kg",     "OTHER",     "BAG",       "950.00",   "40",  "15", "Tile fixing adhesive 20kg bag"),
    ("Wall Putty 20kg",        "OTHER",     "BAG",       "780.00",   "25",  "10", "White wall putty for interior finish"),
    ("Primer (Exterior)",      "OTHER",     "LITER",     "420.00",   "20",   "8", "Weather-resistant exterior wall primer"),
    ("Paint (Exterior) 20L",   "OTHER",     "PIECE",    "7500.00",    "6",   "2", "Premium acrylic exterior emulsion paint 20L"),
    ("Paint (Interior) 20L",   "OTHER",     "PIECE",    "5800.00",    "8",   "2", "Washable interior emulsion paint 20L"),
    ("Glass Mosaic Tile",      "OTHER",     "SQ_METER", "1800.00",   "20",   "5", "Vitrified glass mosaic floor tile"),
    ("Ceramic Wall Tile",      "OTHER",     "SQ_METER",  "950.00",   "35",  "10", "Ceramic wall tile 300x450mm"),
    ("Nails (1kg assorted)",   "OTHER",     "KG",         "85.00",   "20",   "8", "Assorted construction nails 1kg"),
]

EQUIPMENT = [
    # (name, type, status, daily_rate, qty, description)
    ("Concrete Mixer 200L",     "HEAVY",   "AVAILABLE",  "3500.00", 2, "Diesel concrete mixer 200 litre capacity"),
    ("Concrete Mixer 500L",     "HEAVY",   "IN_USE",     "6500.00", 1, "Diesel concrete mixer 500 litre — for large pours"),
    ("Concrete Vibrator",       "LIGHT",   "AVAILABLE",  "1500.00", 3, "Needle vibrator for concrete compaction"),
    ("Scaffolding Set (20ft)",  "LIGHT",   "IN_USE",      "800.00",10, "Adjustable steel scaffolding 20ft set"),
    ("Plate Compactor",         "HEAVY",   "AVAILABLE",  "2500.00", 1, "Plate compactor for soil/sub-base compaction"),
    ("Excavator (JCB)",         "HEAVY",   "AVAILABLE", "25000.00", 1, "JCB 3CX backhoe excavator — hired as needed"),
    ("Generator 5KVA",          "HEAVY",   "AVAILABLE",  "2000.00", 1, "5KVA diesel generator for site power"),
    ("Water Pump 1HP",          "LIGHT",   "IN_USE",      "600.00", 2, "1HP centrifugal water pump for construction use"),
    ("Angle Grinder",           "TOOL",    "AVAILABLE",   "400.00", 4, "4.5 inch angle grinder for cutting rebar/tiles"),
    ("Electric Drill",          "TOOL",    "AVAILABLE",   "350.00", 3, "Impact drill for masonry and woodwork"),
    ("Bar Bending Machine",     "LIGHT",   "IN_USE",     "1800.00", 1, "Manual rebar bending and cutting machine"),
    ("Pipe Threading Machine",  "TOOL",    "MAINTENANCE", "900.00", 1, "Electric pipe threader for plumbing work"),
    ("Transit Mixer Truck",     "VEHICLE", "AVAILABLE", "15000.00", 1, "4m³ transit mixer for ready-mix concrete"),
    ("Tipping Truck (Tipper)",  "VEHICLE", "AVAILABLE",  "8000.00", 2, "5 tonne tipper truck for material transport"),
    ("Dumper (Site)",           "VEHICLE", "IN_USE",     "3500.00", 1, "Mini site dumper for internal material movement"),
    ("Tower Light (LED)",       "LIGHT",   "AVAILABLE",  "1200.00", 2, "2x500W LED tower light for night work"),
    ("Welding Machine",         "TOOL",    "AVAILABLE",   "800.00", 2, "Arc welding machine 200A"),
    ("Laser Level",             "TOOL",    "AVAILABLE",   "600.00", 2, "Self-levelling laser level for layout"),
]

WORKERS = [
    # (name, role, daily_wage, phone, address)
    ("Ram Bahadur Tamang",    "MASON",       "1100.00", "9841234567", "Bhaktapur"),
    ("Shyam Prasad Karki",    "MASON",       "1050.00", "9852345678", "Lalitpur"),
    ("Hari Bdr Lama",         "MASON",        "950.00", "9863456789", "Sindhupalchok"),
    ("Gopal Krishna Shrestha","CARPENTER",   "1200.00", "9874567890", "Kathmandu"),
    ("Bikash Rai",            "CARPENTER",   "1150.00", "9885678901", "Dharan"),
    ("Prakash Gurung",        "CARPENTER",   "1100.00", "9896789012", "Pokhara"),
    ("Deepak Shrestha",       "ELECTRICIAN", "1400.00", "9807890123", "Kathmandu"),
    ("Nabin Maharjan",        "ELECTRICIAN", "1350.00", "9818901234", "Patan"),
    ("Surya Bdr Thapa",       "PLUMBER",     "1300.00", "9829012345", "Gorkha"),
    ("Dipendra Adhikari",     "PLUMBER",     "1250.00", "9830123456", "Chitwan"),
    ("Sita Devi Tamang",      "PAINTER",      "900.00", "9841234560", "Kavre"),
    ("Mina Gurung",           "PAINTER",      "880.00", "9852345670", "Nuwakot"),
    ("Binod Kumar Yadav",     "LABORER",      "750.00", "9863456780", "Mahottari"),
    ("Santosh Mahato",        "LABORER",      "730.00", "9874567800", "Sarlahi"),
    ("Kamala Devi BK",        "LABORER",      "700.00", "9885678900", "Dadeldhura"),
    ("Kiran Tamang",          "LABORER",      "720.00", "9896789000", "Dolakha"),
    ("Rajendra Khadka",       "SUPERVISOR",  "1800.00", "9807890100", "Kathmandu"),
    ("Prasad Acharya",        "SUPERVISOR",  "1750.00", "9818901200", "Bhaktapur"),
    ("Bijay Kumar Jha",       "ENGINEER",    "2500.00", "9829012300", "Janakpur"),
]

SUPPLIERS = [
    # (name, contact, phone, email, address, specialty, notes)
    ("Hetauda Cement Industries", "Dipendra Khanal",  "014567890", "sales@hetauda-cement.com.np",
     "Hetauda, Makwanpur", "MATERIALS", "Official distributor — OPC & PPC cement"),
    ("Pashupati Steel Udhyog",   "Ramesh Baral",     "014578901", "info@pashupatisteel.com.np",
     "Balaju, Kathmandu",  "MATERIALS", "TMT rebar supplier — Fe500 grade"),
    ("Sanima Sand & Aggregate",  "Bikram Thapa",     "9801234567", "",
     "Bhaktapur",          "MATERIALS", "River sand, stone aggregate, stone dust"),
    ("Nepal Brick Udhyog",       "Sanjay Maharjan",  "9812345678", "nepal.brick@gmail.com",
     "Thimi, Bhaktapur",   "MATERIALS", "Machine-pressed bricks and hollow blocks"),
    ("Jyoti Electrical Pasal",   "Sunil Shrestha",   "014589012", "jyoti.elec@gmail.com",
     "New Road, Kathmandu","MATERIALS", "Electrical wire, conduit, MCB, DB boards"),
    ("Shree Plumbing House",     "Mohan Karki",      "9823456789", "",
     "Ason, Kathmandu",    "MATERIALS", "CPVC/UPVC pipes, fittings, sanitaryware"),
    ("Pokhrel Timber Depot",     "Dil Bahadur Pokhrel","9834567890","",
     "Jorpati, Kathmandu", "MATERIALS", "Sal wood, plywood, bamboo poles"),
    ("Himalayan Hardware",       "Anil Tamang",      "014590123", "himalayan.hw@gmail.com",
     "Sundhara, Kathmandu","MATERIALS", "General construction hardware — nails, tools, paint"),
    ("Siddhartha Paint Center",  "Roshan Thapa",     "9845678901", "",
     "Putalisadak",        "MATERIALS", "Exterior/interior paints, primer, waterproofing"),
    ("Sagun JCB Services",       "Kamal Bista",      "9856789012", "sagun.jcb@gmail.com",
     "Koteshwor",          "EQUIPMENT", "JCB excavator and heavy equipment hire"),
    ("Everest Scaffolding",      "Suresh Rai",       "9867890123", "",
     "Baneshwor",          "EQUIPMENT", "Scaffolding, shuttering, formwork rent"),
    ("United Concrete Mix",      "Naresh Shrestha",  "014601234", "united.concrete@gmail.com",
     "Thapathali",         "EQUIPMENT", "Transit mixer and ready-mix concrete supply"),
    ("Ram Lal Construction",     "Ram Lal Gupta",    "9878901234", "",
     "Birgunj, Parsa",     "LABOR",     "Skilled mason and laborer supply contractor"),
]

PURCHASE_ORDERS = [
    # (supplier_idx, order_number, days_ago, status, notes, items)
    # items = [(material_name_partial, qty, unit_price)]
    (0, "PO-2081-001", 45, "RECEIVED", "Monthly cement order",
     [("OPC Cement", "100", "850.00"), ("PPC Cement", "60", "820.00")]),

    (1, "PO-2081-002", 38, "RECEIVED", "Steel rebar for foundation",
     [("Steel Rebar 10mm", "800", "93.00"), ("Steel Rebar 12mm", "600", "92.00"), ("Binding Wire", "30", "75.00")]),

    (2, "PO-2081-003", 30, "RECEIVED", "Sand and aggregate for RCC",
     [("River Sand (Fine)", "15", "2800.00"), ("Stone Aggregate 20mm", "12", "3200.00")]),

    (4, "PO-2081-004", 20, "RECEIVED", "Electrical materials — Phase 1",
     [("PVC Wire 1.5mm", "8", "3500.00"), ("PVC Wire 2.5mm", "5", "5500.00"),
      ("MCB 32A", "12", "450.00"), ("Conduit Pipe 20mm", "80", "45.00")]),

    (5, "PO-2081-005", 15, "ORDERED", "Plumbing materials — Phase 1",
     [("CPVC Pipe 1/2 inch", "60", "120.00"), ("CPVC Pipe 3/4 inch", "40", "180.00"),
      ("UPVC Pipe 4 inch", "30", "320.00"), ("Ball Valve 1/2 inch", "10", "350.00")]),

    (7, "PO-2081-006", 10, "ORDERED", "Hardware and paint materials",
     [("Tile Adhesive 20kg", "30", "950.00"), ("Wall Putty 20kg", "20", "780.00"),
      ("Nails (1kg assorted)", "15", "85.00")]),

    (0, "PO-2081-007",  5, "DRAFT",   "Next cement batch — pending approval",
     [("OPC Cement", "80", "860.00"), ("PPC Cement", "40", "830.00")]),
]


class Command(BaseCommand):
    help = "Seed the Resource module with realistic Nepali construction data"

    def add_arguments(self, parser):
        parser.add_argument("--project", type=int, default=3,
                            help="HouseProject ID to seed data for (default: 3)")
        parser.add_argument("--clear", action="store_true",
                            help="Delete existing resource data for this project before seeding")

    def handle(self, *args, **options):
        project_id = options["project"]
        do_clear   = options["clear"]

        # ── Validate project ──────────────────────────────────────────────────
        try:
            project = HouseProject.objects.get(id=project_id)
        except HouseProject.DoesNotExist:
            self.stderr.write(self.style.ERROR(
                f"Project id={project_id} not found. "
                f"Available: {list(HouseProject.objects.values_list('id', 'name'))}"
            ))
            return

        self.stdout.write(f"\n🏗️  Seeding resource data for: {project.name} (id={project.id})\n")

        # ── Clear ─────────────────────────────────────────────────────────────
        if do_clear:
            self.stdout.write("  🗑️  Clearing existing data...")
            StockMovement.objects.filter(project=project).delete()
            PurchaseOrderItem.objects.filter(order__project=project).delete()
            PurchaseOrder.objects.filter(project=project).delete()
            WorkerAttendance.objects.filter(worker__project=project).delete()
            Worker.objects.filter(project=project).delete()
            Equipment.objects.filter(project=project).delete()
            Supplier.objects.filter(project=project).delete()
            Material.objects.filter(project=project).delete()
            self.stdout.write(self.style.WARNING("  Existing data cleared.\n"))

        # ── Materials ─────────────────────────────────────────────────────────
        self.stdout.write("  📦 Creating materials...")
        material_map = {}
        mat_created = 0
        for row in MATERIALS:
            name, cat, unit, price, stock, reorder, desc = row
            mat, created = Material.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    category=cat, unit=unit,
                    unit_price=Decimal(price),
                    stock_qty=Decimal(stock),
                    reorder_level=Decimal(reorder),
                    description=desc,
                    is_active=True,
                )
            )
            material_map[name] = mat
            if created:
                mat_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {mat_created} materials created ({len(MATERIALS) - mat_created} already existed)"))

        # ── Equipment ─────────────────────────────────────────────────────────
        self.stdout.write("  🚜 Creating equipment...")
        eq_created = 0
        for name, etype, status, rate, qty, desc in EQUIPMENT:
            _, created = Equipment.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    equipment_type=etype, status=status,
                    daily_rate=Decimal(rate),
                    quantity=qty, description=desc,
                    is_active=True,
                )
            )
            if created:
                eq_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {eq_created} equipment records created"))

        # ── Workers ───────────────────────────────────────────────────────────
        self.stdout.write("  👷 Creating workers...")
        workers = []
        w_created = 0
        for name, role, wage, phone, address in WORKERS:
            w, created = Worker.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    role=role,
                    daily_wage=Decimal(wage),
                    phone=phone,
                    address=address,
                    is_active=True,
                    joined_date=datetime.date.today() - datetime.timedelta(days=random.randint(30, 180)),
                )
            )
            workers.append(w)
            if created:
                w_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {w_created} workers created"))

        # ── Attendance (last 30 days for all active workers) ──────────────────
        self.stdout.write("  📅 Generating attendance records (last 30 days)...")
        att_created = 0
        today = datetime.date.today()
        for worker in workers:
            for days_back in range(1, 31):
                day = today - datetime.timedelta(days=days_back)
                if day.weekday() == 6:          # skip Sundays (Nepal holiday)
                    continue
                is_present = random.random() > 0.12   # ~88% attendance
                overtime   = Decimal(str(round(random.uniform(0, 2), 1))) if is_present and random.random() > 0.75 else Decimal("0")
                _, created = WorkerAttendance.objects.get_or_create(
                    worker=worker, date=day,
                    defaults=dict(is_present=is_present, overtime_hours=overtime)
                )
                if created:
                    att_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {att_created} attendance records created"))

        # ── Suppliers ─────────────────────────────────────────────────────────
        self.stdout.write("  🏪 Creating suppliers...")
        supplier_list = []
        sup_created = 0
        for name, contact, phone, email, address, specialty, notes in SUPPLIERS:
            s, created = Supplier.objects.get_or_create(
                project=project, name=name,
                defaults=dict(
                    contact_person=contact, phone=phone,
                    email=email, address=address,
                    specialty=specialty, notes=notes,
                    is_active=True,
                )
            )
            supplier_list.append(s)
            if created:
                sup_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {sup_created} suppliers created"))

        # ── Purchase Orders ───────────────────────────────────────────────────
        self.stdout.write("  📋 Creating purchase orders...")
        po_created = 0
        for sup_idx, order_no, days_ago, status, notes, items in PURCHASE_ORDERS:
            supplier   = supplier_list[sup_idx]
            order_date = today - datetime.timedelta(days=days_ago)
            expected   = order_date + datetime.timedelta(days=7)

            po, created = PurchaseOrder.objects.get_or_create(
                project=project, order_number=order_no,
                defaults=dict(
                    supplier=supplier, order_date=order_date,
                    expected_date=expected, status=status,
                    notes=notes,
                )
            )
            if created:
                po_created += 1
                for mat_partial, qty, price in items:
                    # find material by partial name
                    mat = next(
                        (m for k, m in material_map.items() if mat_partial in k),
                        None
                    )
                    received_qty = Decimal(qty) if status == "RECEIVED" else Decimal("0")
                    PurchaseOrderItem.objects.create(
                        order=po,
                        material=mat,
                        description=mat.name if mat else mat_partial,
                        quantity=Decimal(qty),
                        unit_price=Decimal(price),
                        received_qty=received_qty,
                    )

                    # If RECEIVED, create a stock movement
                    if status == "RECEIVED" and mat:
                        StockMovement.objects.create(
                            project=project,
                            material=mat,
                            movement_type="IN",
                            quantity=Decimal(qty),
                            unit_price=Decimal(price),
                            reference=order_no,
                            notes=f"Received via {order_no}",
                        )

        self.stdout.write(self.style.SUCCESS(f"     ✓ {po_created} purchase orders created"))

        # ── Stock Movements (extra usage records) ─────────────────────────────
        self.stdout.write("  🔄 Generating stock usage movements...")
        usage_data = [
            ("OPC Cement",          "30",  "Consumed in foundation RCC pour"),
            ("Steel Rebar 10mm",   "200",  "Used in foundation column bars"),
            ("Steel Rebar 12mm",   "150",  "Used in foundation beam bars"),
            ("River Sand (Fine)",    "5",  "Used in plastering work"),
            ("River Sand (Coarse)", "10",  "Used in concrete mix"),
            ("Stone Aggregate 20mm","8",   "Used in RCC slab mix"),
            ("Brick (Machine Pressed)","1500","Used in boundary wall"),
            ("Bamboo Poles",        "20",  "Used for scaffolding"),
            ("Binding Wire",        "10",  "Used binding rebar in foundation"),
        ]
        mv_created = 0
        for mat_name, qty, note in usage_data:
            mat = material_map.get(mat_name)
            if not mat:
                continue
            _, created = StockMovement.objects.get_or_create(
                project=project, material=mat, movement_type="OUT",
                notes=note,
                defaults=dict(
                    quantity=Decimal(qty),
                    reference="SITE-USAGE",
                    notes=note,
                )
            )
            if created:
                mv_created += 1
        self.stdout.write(self.style.SUCCESS(f"     ✓ {mv_created} stock usage records created"))

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("\n" + "─" * 55)
        self.stdout.write(self.style.SUCCESS("✅  Seed complete!\n"))
        self.stdout.write(f"   Materials      : {Material.objects.filter(project=project).count()}")
        self.stdout.write(f"   Equipment      : {Equipment.objects.filter(project=project).count()}")
        self.stdout.write(f"   Workers        : {Worker.objects.filter(project=project).count()}")
        self.stdout.write(f"   Attendance     : {WorkerAttendance.objects.filter(worker__project=project).count()}")
        self.stdout.write(f"   Suppliers      : {Supplier.objects.filter(project=project).count()}")
        self.stdout.write(f"   Purchase Orders: {PurchaseOrder.objects.filter(project=project).count()}")
        self.stdout.write(f"   Stock Movements: {StockMovement.objects.filter(project=project).count()}")
        self.stdout.write(f"\n   Low Stock items: {sum(1 for m in Material.objects.filter(project=project) if m.is_low_stock)}")
        self.stdout.write("\n   Run: python manage.py seed_resource --project 4  to seed the second project too.\n")
