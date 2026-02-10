from django.core.management.base import BaseCommand
from apps.core.models import ConstructionPhase, Room, HouseProject, Floor
from apps.resources.models import Material, Contractor, Supplier
from apps.finance.models import BudgetCategory, Expense
from apps.tasks.models import Task
from django.utils import timezone
from datetime import timedelta
import random

class Command(BaseCommand):
    help = 'Seeds the database with comprehensive Nepali construction data'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding Comprehensive Nepali Construction Data...')
        
        # CLEAR EXISTING DATA
        self.stdout.write('Clearing existing data...')
        Expense.objects.all().delete()
        Task.objects.all().delete()
        ConstructionPhase.objects.all().delete()
        Room.objects.all().delete()
        Floor.objects.all().delete()
        Material.objects.all().delete()
        Contractor.objects.all().delete()
        Supplier.objects.all().delete()
        BudgetCategory.objects.all().delete()
        HouseProject.objects.all().delete()

        # 0. House Project
        project = HouseProject.objects.create(
            name="Mero Ghar (Dream Home)",
            owner_name='Ram Bahadur',
            address='Budhanilkantha, Kathmandu',
            total_budget=25000000.00, # 2.5 Crore
            start_date=timezone.now().date() - timedelta(days=60),
            expected_completion_date=timezone.now().date() + timedelta(days=300),
            area_sqft=2800
        )
        self.stdout.write(self.style.SUCCESS(f'Created Project: {project.name}'))

        # 1. Construction Phases
        phases_data = [
            {'order': 1, 'name': 'Engineering & Design', 'status': 'COMPLETED', 'desc': 'Site survey, Soil Test, Architectural drawings, Structural analysis, Municipality passing.'},
            {'order': 2, 'name': 'Foundation (Base)', 'status': 'COMPLETED', 'desc': 'Excavation, Soling, PCC, Footing, Tie Beams, and DPC level.'},
            {'order': 3, 'name': 'Ground Floor Structure', 'status': 'COMPLETED', 'desc': 'Piller erection, Wall construction (Garo), and Slab Casting (Dhalan).'},
            {'order': 4, 'name': 'First Floor Structure', 'status': 'IN_PROGRESS', 'desc': 'Column extension, Brickwork, and Slab casting for first floor.'},
            {'order': 5, 'name': 'Second Floor Structure', 'status': 'PENDING', 'desc': 'Final floor structure, roofing, and water tank placement.'},
            {'order': 6, 'name': 'Plaster & Flooring', 'status': 'PENDING', 'desc': 'Internal/External plaster, Tile/Marble works, and Screeding.'},
            {'order': 7, 'name': 'Plumbing & Electrical', 'status': 'PENDING', 'desc': 'Conduit piping, wiring, sanitary fittings, and septic tank connection.'},
            {'order': 8, 'name': 'Door & Window Works', 'status': 'PENDING', 'desc': 'Chaukhat (Frames), Shutters, Glass works, and Grills.'},
            {'order': 9, 'name': 'Painting & Finishing', 'status': 'PENDING', 'desc': 'Wall Putty, Primer, Final Paint, Railings, and Cleaning.'},
        ]
        
        phases = {}
        for p in phases_data:
            phase = ConstructionPhase.objects.create(
                name=p['name'], 
                order=p['order'], 
                status=p['status'],
                description=p['desc']
            )
            phases[p['name']] = phase
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(phases)} Phases'))

        # 1.5 Create Floors
        floors_data = [
            {'name': 'Ground Floor (Bhui Talla)', 'level': 0},
            {'name': 'First Floor (Pahilo Talla)', 'level': 1},
            {'name': 'Second Floor (Dosro Talla)', 'level': 2},
            {'name': 'Third Floor (Tesro Talla)', 'level': 3},
            {'name': 'Roof Top (Kausi)', 'level': 4},
        ]
        
        floors = {}
        for f in floors_data:
            obj = Floor.objects.create(name=f['name'], level=f['level'])
            floors[f['level']] = obj

        self.stdout.write(self.style.SUCCESS(f'Created {len(floors)} Floors'))

        # 2. Rooms
        rooms_data = [
            {'name': 'Living Room (Baithak)', 'floor_level': 0},
            {'name': 'Kitchen & Dining', 'floor_level': 0},
            {'name': 'Guest Bedroom', 'floor_level': 0},
            {'name': 'Common Bathroom (G/F)', 'floor_level': 0},
            
            {'name': 'Master Bedroom', 'floor_level': 1},
            {'name': 'Children Room 1', 'floor_level': 1},
            {'name': 'Common Bathroom (1/F)', 'floor_level': 1},
            {'name': 'Family Lobby', 'floor_level': 1},
            
            {'name': 'Puja Kotha', 'floor_level': 2},
            {'name': 'Store Room', 'floor_level': 2},
            {'name': 'Terrace Area', 'floor_level': 2},
        ]
        
        rooms = []
        for r in rooms_data:
            floor = floors.get(r['floor_level'])
            if floor:
                room = Room.objects.create(name=r['name'], floor=floor)
                rooms.append(room)
            
        self.stdout.write(self.style.SUCCESS(f'Created {len(rooms)} Rooms'))

        # 3. Contractors / Resource People
        contractors_data = [
            {'name': 'Hari Krishna (Thekedaar)', 'role': 'THEKEDAAR', 'phone': '9841000001', 'rate': 0},
            {'name': 'Er. Binod Sharma', 'role': 'ENGINEER', 'phone': '9851000002', 'rate': 5000},
            {'name': 'Kancha Bhai (Mason Head)', 'role': 'MISTRI', 'phone': '9801000003', 'rate': 1200},
            {'name': 'Ramesh (Plumber)', 'role': 'PLUMBER', 'phone': '9812000004', 'rate': 1500},
            {'name': 'Suresh (Electrician)', 'role': 'ELECTRICIAN', 'phone': '9860000005', 'rate': 1500},
            {'name': 'Shyam (Welder)', 'role': 'WELDER', 'phone': '9841000006', 'rate': 0},
            {'name': 'Bishnu (Painter)', 'role': 'PAINTER', 'phone': '9843000007', 'rate': 1100},
        ]
        
        contractors = {}
        for c in contractors_data:
            obj = Contractor.objects.create(
                name=c['name'],
                role=c['role'],
                phone=c['phone'],
                rate=c['rate']
            )
            contractors[c['role']] = obj

        self.stdout.write(self.style.SUCCESS(f'Created {len(contractors)} Contractors'))

        # 3.5 Suppliers
        suppliers_data = [
            {'name': 'Pashupati Hardware', 'contact': 'Rajesh Hamal', 'phone': '9851012345', 'cat': 'Civil Materials'},
            {'name': 'Arniko Itta Udhyog', 'contact': 'Shiva Shrestha', 'phone': '9841054321', 'cat': 'Bricks'},
            {'name': 'Everest Marble & Granite', 'contact': 'Madan Krishna', 'phone': '9801122334', 'cat': 'Flooring'},
            {'name': 'Nepal Pipe & Fittings', 'contact': 'Hari Bansha', 'phone': '9860111222', 'cat': 'Plumbing'},
            {'name': 'Lumbini Electricals', 'contact': 'Pradeep Khadka', 'phone': '9843666777', 'cat': 'Electrical'},
        ]
        
        suppliers = {}
        for s in suppliers_data:
            obj = Supplier.objects.create(
                name=s['name'],
                contact_person=s['contact'],
                phone=s['phone'],
                category=s['cat']
            )
            suppliers[s['name']] = obj

        self.stdout.write(self.style.SUCCESS(f'Created {len(suppliers)} Suppliers'))

        # 4. Materials Inventory
        materials_data = [
            {'name': 'OPC Cement (Shivam)', 'unit': 'BORA', 'cat': 'Civil', 'est': 500, 'bought': 200, 'used': 150, 'cost': 850},
            {'name': 'PPC Cement (Jagdamba)', 'unit': 'BORA', 'cat': 'Civil', 'est': 300, 'bought': 0, 'used': 0, 'cost': 750},
            {'name': 'TMT Bars 12mm (Ambe)', 'unit': 'KG', 'cat': 'Civil', 'est': 5000, 'bought': 2500, 'used': 2000, 'cost': 110},
            {'name': 'TMT Bars 16mm (Ambe)', 'unit': 'KG', 'cat': 'Civil', 'est': 3000, 'bought': 3000, 'used': 2800, 'cost': 112},
            {'name': 'Red Bricks (No. 1)', 'unit': 'TRACTOR', 'cat': 'Civil', 'est': 50, 'bought': 20, 'used': 15, 'cost': 18000},
            {'name': 'Sand (River Washed)', 'unit': 'TIPPER', 'cat': 'Civil', 'est': 15, 'bought': 8, 'used': 6, 'cost': 28000},
            {'name': 'Aggregates (Gitti)', 'unit': 'TIPPER', 'cat': 'Civil', 'est': 12, 'bought': 7, 'used': 5, 'cost': 26000},
            {'name': 'Water Tank (1000L)', 'unit': 'PCS', 'cat': 'Plumbing', 'est': 2, 'bought': 0, 'used': 0, 'cost': 15000},
        ]

        for m in materials_data:
            # Randomly assign a supplier based on category
            m_cat = m['cat']
            matching_suppliers = [s for s in suppliers.values() if m_cat in s.category]
            supplier = random.choice(matching_suppliers) if matching_suppliers else random.choice(list(suppliers.values()))

            Material.objects.create(
                name=m['name'],
                unit=m['unit'],
                category=m_cat,
                quantity_estimated=m['est'],
                quantity_purchased=m['bought'],
                quantity_used=m['used'],
                avg_cost_per_unit=m['cost'],
                current_stock=m['bought'] - m['used'],
                supplier=supplier
            )
        
        self.stdout.write(self.style.SUCCESS(f'Created {len(materials_data)} Materials'))

        # 5. Budget Categories
        budget_cats = {
            'Materials': 15000000, 
            'Labor': 6000000, 
            'Design & Permits': 500000, 
            'Equipment Rental': 500000, 
            'Finishing & Interiors': 3000000
        }
        categories = {}
        for name, alloc in budget_cats.items():
            obj = BudgetCategory.objects.create(name=name, allocation=alloc)
            categories[name] = obj

        # 6. Tasks & Expenses
        
        # --- Phase 1: Engineering ---
        eng_phase = phases['Engineering & Design']
        Task.objects.create(title='Site Survey & Soil Test', phase=eng_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['ENGINEER'])
        Task.objects.create(title='Architectural Drawings', phase=eng_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['ENGINEER'])
        Task.objects.create(title='Municipality Map Pass', phase=eng_phase, status='COMPLETED', priority='CRITICAL', assigned_to=contractors['THEKEDAAR'])
        
        Expense.objects.create(title='Engineering Consultancy Fee', amount=150000, category=categories['Design & Permits'], phase=eng_phase, date=timezone.now().date()-timedelta(days=60), paid_to='Creative Eng. Consult')
        Expense.objects.create(title='Municipality Dastur', amount=45000, category=categories['Design & Permits'], phase=eng_phase, date=timezone.now().date()-timedelta(days=50), paid_to='Kathmandu Metropolis')

        # --- Phase 2: Foundation ---
        found_phase = phases['Foundation (Base)']
        Task.objects.create(title='Excavation (Jag Khanne)', phase=found_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Soling & PCC', phase=found_phase, status='COMPLETED', priority='MEDIUM', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Footing Mesh Layout', phase=found_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Double Tie Beam Casting', phase=found_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['MISTRI'])

        Expense.objects.create(title='JCB Excavator Charge', amount=35000, category=categories['Equipment Rental'], phase=found_phase, date=timezone.now().date()-timedelta(days=40), paid_to='Ram JCB House')
        Expense.objects.create(title='Cement & Sand (Foundation)', amount=450000, category=categories['Materials'], phase=found_phase, date=timezone.now().date()-timedelta(days=38), paid_to='New Hardware Center', supplier=suppliers['Pashupati Hardware'])
        Expense.objects.create(title='Steel Purchase (Foundation)', amount=600000, category=categories['Materials'], phase=found_phase, date=timezone.now().date()-timedelta(days=42), paid_to='Ambe Steels Dealer', supplier=suppliers['Pashupati Hardware'])
        Expense.objects.create(title='Labor Payment (Foundation)', amount=250000, category=categories['Labor'], phase=found_phase, date=timezone.now().date()-timedelta(days=20), paid_to='Hari Thekedaar')

        # --- Phase 3: Ground Floor ---
        gf_phase = phases['Ground Floor Structure']
        Task.objects.create(title='Column Casting (7ft)', phase=gf_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Wall Brickwork (Garo)', phase=gf_phase, status='COMPLETED', priority='MEDIUM', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Formwork (Centering)', phase=gf_phase, status='COMPLETED', priority='HIGH', assigned_to=contractors['THEKEDAAR'])
        Task.objects.create(title='Slab Casting (Dhalan)', phase=gf_phase, status='COMPLETED', priority='CRITICAL', assigned_to=contractors['MISTRI'])

        Expense.objects.create(title='Red Bricks (20k pcs)', amount=360000, category=categories['Materials'], phase=gf_phase, date=timezone.now().date()-timedelta(days=15), paid_to='Bhairab Itta Bhatta', supplier=suppliers['Arniko Itta Udhyog'])
        Expense.objects.create(title='Cement for Slab', amount=180000, category=categories['Materials'], phase=gf_phase, date=timezone.now().date()-timedelta(days=5), paid_to='New Hardware Center', supplier=suppliers['Pashupati Hardware'])
        
        # --- Phase 4: First Floor (Current) ---
        ff_phase = phases['First Floor Structure']
        Task.objects.create(title='Column Extension', phase=ff_phase, status='IN_PROGRESS', priority='HIGH', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Brickwork Layout', phase=ff_phase, status='IN_PROGRESS', priority='MEDIUM', assigned_to=contractors['MISTRI'])
        Task.objects.create(title='Electrical Piping (Wall)', phase=ff_phase, status='PENDING', priority='MEDIUM', assigned_to=contractors['ELECTRICIAN'])
        Task.objects.create(title='Slab Casting Schedule', phase=ff_phase, status='PENDING', priority='CRITICAL', assigned_to=contractors['THEKEDAAR'])

        # --- Future Phases ---
        plumb_phase = phases['Plumbing & Electrical']
        Task.objects.create(title='Septic Tank Connection', phase=plumb_phase, status='PENDING', priority='MEDIUM', assigned_to=contractors['PLUMBER'])
        Task.objects.create(title='Reserve Tank Construction', phase=plumb_phase, status='PENDING', priority='MEDIUM', assigned_to=contractors['MISTRI'])

        paint_phase = phases['Painting & Finishing']
        Task.objects.create(title='Wall Putty (2 Coat)', phase=paint_phase, status='PENDING', priority='LOW', assigned_to=contractors['PAINTER'])

        self.stdout.write(self.style.SUCCESS(f'Created Tasks and Expenses across 3 active phases and 2 future phases'))
        self.stdout.write(self.style.SUCCESS('Seeding Complete! Database is now populated with realistic data.'))
