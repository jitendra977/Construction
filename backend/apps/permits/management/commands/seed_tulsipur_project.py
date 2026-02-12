from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.core.models import HouseProject, ConstructionPhase
from apps.finance.models import BudgetCategory, FundingSource, Expense, Payment, FundingTransaction
from apps.resources.models import Material, Supplier, Contractor, MaterialTransaction
from apps.permits.models import PermitStep
from decimal import Decimal
import random

class Command(BaseCommand):
    help = 'Seeds the database with a realistic 3-floor residential project for Tulsipur, Dang'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.WARNING('Wiping existing data (except users)...'))
        
        # Delete old data in order
        Payment.objects.all().delete()
        MaterialTransaction.objects.all().delete()
        Expense.objects.all().delete()
        FundingTransaction.objects.all().delete()
        FundingSource.objects.all().delete()
        Material.objects.all().delete()
        Supplier.objects.all().delete()
        Contractor.objects.all().delete()
        BudgetCategory.objects.all().delete()
        ConstructionPhase.objects.all().delete()
        PermitStep.objects.all().delete()
        HouseProject.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Data wiped. Starting Tulsipur Project Seed...'))

        # 1. Project
        project = HouseProject.objects.create(
            name="Dream Home Tulsipur (Residential)",
            owner_name="Jitendra Khadka",
            address="Tulsipur-6, Dang, Nepal",
            start_date=timezone.now().date(),
            expected_completion_date=timezone.now().date().replace(year=timezone.now().year + 1),
            total_budget=Decimal('15000000'),  # 1.5 Crore
            area_sqft=2500
        )
        self.stdout.write(f'Created Project: {project.name}')

        # 2. Budget Categories (Total 1.5 Cr)
        categories = [
            ("Civil Works & Structure (जग र संरचना)", "7500000"),  # 50%
            ("Finishing & Interior (फिनिसिङ)", "3500000"),        # 23.3%
            ("MEP: Electrical & Plumbing (बिजुली र प्लम्बिङ)", "1500000"), # 10%
            ("Labor & Wages (ज्यामी र मिस्त्री खर्च)", "2000000"),     # 13.3%
            ("Consulting & Permits (नक्सा र अनुमति)", "500000"),       # 3.3%
        ]
        
        cat_objs = {}
        for name, alloc in categories:
            cat = BudgetCategory.objects.create(name=name, allocation=Decimal(alloc))
            cat_objs[name] = cat
        self.stdout.write('Created Budget Categories')

        # 3. Construction Phases (Ordered)
        phases_data = [
            ("1. Planning & Design", "Naksa Pass, Structural Drawing", "COMPLETED", "2024-01-01", "2024-02-01"),
            ("2. Site Preparation", "Cleaning, Layout, Boring", "COMPLETED", "2024-02-01", "2024-02-15"),
            ("3. Foundation (Jag)", "Excavation, Soling, Footing, Tie Beam (DPC)", "IN_PROGRESS", "2024-02-15", "2024-03-30"),
            ("4. Ground Floor Structure", "Column Raising, Brickwork, Slab Casting (Dhalan)", "PENDING", "2024-04-01", "2024-05-15"),
            ("5. First Floor Structure", "Column, Brickwork, Slab Casting", "PENDING", "2024-05-15", "2024-06-30"),
            ("6. Second Floor Structure", "Column, Brickwork, Slab Casting", "PENDING", "2024-07-01", "2024-08-15"),
            ("7. Roofing & Top Floor", "Truss Work, Water Tank, Solar", "PENDING", "2024-08-15", "2024-09-01"),
            ("8. Electrical & Plumbing", "Piping, Wiring, Sanitary Installation", "PENDING", "2024-09-01", "2024-10-30"),
            ("9. Finishing (Plaster/Paint)", "Plaster, Putty, Paint, Tiling, Railing", "PENDING", "2024-11-01", "2024-12-30"),
        ]

        phase_objs = {}
        for idx, (name, desc, status, start, end) in enumerate(phases_data):
            # Phase 1 requires and has approved municipal permit
            permit_data = {}
            if idx == 0:  # Planning & Design phase
                permit_data = {
                    'permit_required': True,
                    'permit_status': 'APPROVED',
                    'permit_date_issued': '2024-02-01',
                    'permit_notes': 'Naksa approved by Tulsipur Sub-Metropolitan City. Permit No: TSM/2024/001'
                }
            
            p = ConstructionPhase.objects.create(
                name=name,
                description=desc,
                status=status,
                start_date=start,
                end_date=end,
                order=idx + 1,  # Set sequential order
                estimated_budget=Decimal('1500000'),  # Placeholder average
                **permit_data
            )
            phase_objs[name] = p
        
        # Link specifically active phase
        foundation_phase = phase_objs["3. Foundation (Jag)"]
        
        self.stdout.write('Created Construction Phases')

        # 4. Suppliers (Tulsipur/Dang Local)
        suppliers_data = [
            ("Rapti Hardware & Suppliers", "Tulsipur-5", "9857821000", "Civil Materials"),
            ("Ambe Steels Authorized Dealer", "Ghorahi Road", "9847822000", "Iron/Steel"),
            ("Dang Bricks Industry", "Bijauri", "9867823000", "Bricks"),
            ("Tulsipur Paint House", "Buspark", "9817824000", "Paints"),
            ("New Electric & Sanitary", "B.P. Chowk", "9807825000", "MEP Items"),
        ]
        
        supplier_objs = {}
        for name, addr, phone, cat in suppliers_data:
            s = Supplier.objects.create(name=name, address=addr, phone=phone, category=cat)
            supplier_objs[name] = s

        # 5. Contractors
        contractors_data = [
            ("Ram Bahadur (Civil Thekedar)", "THEKEDAAR", "Standard Civil Works", "9812345678"),
            ("Shyam Electrician", "ELECTRICIAN", "House Wiring Specialist", "9823456789"),
            ("Hari Plumber", "PLUMBER", "Sanitary Works", "9834567890"),
            ("Ramesh Welder", "WELDER", "Grill & Shutter", "9845678901"),
        ]
        
        contractor_objs = {}
        for name, role, skills, phone in contractors_data:
            c = Contractor.objects.create(name=name, role=role, skills=skills, phone=phone)
            contractor_objs[name] = c

        self.stdout.write('Created Suppliers & Contractors')

        # 6. Materials (Inventory)
        materials_data = [
            ("Pipes (Jagdamba)", "Length", "0", "1500", "Pcs"),
            ("Cement (Argakhanchi OPC)", "Sack", "50", "850", "Bags"),
            ("Sand (River)", "Truck", "2", "25000", "Truck"),
            ("Aggregate (Gitti)", "Truck", "1", "28000", "Truck"),
            ("Fe 500 TMT Bar (12mm)", "Ton", "0.5", "105000", "Ton"),
            ("Fe 500 TMT Bar (8mm / Ring)", "Ton", "0.2", "106000", "Ton"),
            ("Bricks (No. 1)", "Pcs", "3000", "18", "Pcs"),
        ]

        material_objs = {}
        for name, unit, stock, cost, display_unit in materials_data:
            m = Material.objects.create(
                name=name,
                unit=display_unit,
                current_stock=Decimal(stock),
                avg_cost_per_unit=Decimal(cost),
                min_stock_level=10  # Arbitrary alert level
            )
            material_objs[name] = m

        self.stdout.write('Created Materials')

        # 7. Funding Sources (Where money comes from)
        funding_sources = [
            ("NIC Asia Bank Loan", "LOAN", "8000000", "2024-01-15", "CHECK", "11.5"),
            ("Personal Savings (Bachat)", "OWN_MONEY", "5000000", "2024-01-01", "CASH", "0"),
            ("Loan from Brother (US)", "BORROWED", "2000000", "2024-02-10", "BANK_TRANSFER", "0"),
        ]
        
        funding_objs = {}
        for name, ftype, amt, date, method, rate in funding_sources:
            f = FundingSource.objects.create(
                name=name,
                source_type=ftype,
                amount=Decimal(amt),
                received_date=date,
                default_payment_method=method,
                interest_rate=Decimal(rate),
                current_balance=Decimal(amt) # Initially full
            )
            funding_objs[name] = f
            
        self.stdout.write('Created Funding Sources')

        # 8. Sample Expenses (Spending the money)
        
        # Expense 1: Permit (Govt)
        exp1 = Expense.objects.create(
            title="Nagarpalika Naksa Pass Fee",
            amount=Decimal('45000'),
            date="2024-01-20",
            category=cat_objs["Consulting & Permits (नक्सा र अनुमति)"],
            expense_type="GOVT",
            phase=phase_objs["1. Planning & Design"],
            paid_to="Tulsipur Sub-Metropolitan City",
            is_paid=True,
            funding_source=funding_objs["Personal Savings (Bachat)"]
        )
        # Record Payment for Exp1
        Payment.objects.create(
            expense=exp1,
            amount=Decimal('45000'),
            date="2024-01-20",
            method="CASH",
            funding_source=funding_objs["Personal Savings (Bachat)"]
        )
        
        # Expense 2: Cement Purchase (Stock In)
        cement_mat = material_objs["Cement (Argakhanchi OPC)"]
        exp2 = Expense.objects.create(
            title="50 Bags Cement for Foundation",
            amount=Decimal('42500'), # 50 * 850
            date="2024-02-16",
            category=cat_objs["Civil Works & Structure (जग र संरचना)"],
            expense_type="MATERIAL",
            phase=foundation_phase,
            material=cement_mat,
            quantity=50,
            unit_price=850,
            supplier=supplier_objs["Rapti Hardware & Suppliers"],
            paid_to=supplier_objs["Rapti Hardware & Suppliers"].name,
            is_paid=False, # Credit purchase initially
            funding_source=funding_objs["NIC Asia Bank Loan"] # Intended source
        )
        # Partial Payment
        Payment.objects.create(
            expense=exp2,
            amount=Decimal('20000'),
            date="2024-02-16",
            method="CHECK",
            reference_id="CHQ-998877",
            funding_source=funding_objs["NIC Asia Bank Loan"]
        )
        # Update Stock manually via helper or let signal handle (signal handles if created properly)
        # Since we wiped data, let's ensure transaction exists
        MaterialTransaction.objects.create(
             material=cement_mat,
             transaction_type='IN',
             quantity=50,
             unit_price=850,
             date="2024-02-16",
             supplier=supplier_objs["Rapti Hardware & Suppliers"],
             expense=exp2,
             notes="Initial cement stock"
        )

        # Expense 3: Labor Advance
        exp3 = Expense.objects.create(
            title="Advance for Foundation Digging",
            amount=Decimal('150000'),
            date="2024-02-18",
            category=cat_objs["Labor & Wages (ज्यामी र मिस्त्री खर्च)"],
            expense_type="LABOR",
            phase=foundation_phase,
            contractor=contractor_objs["Ram Bahadur (Civil Thekedar)"],
            paid_to="Ram Bahadur",
            is_paid=True,
            funding_source=funding_objs["Personal Savings (Bachat)"]
        )
        Payment.objects.create(
            expense=exp3,
            amount=Decimal('150000'),
            date="2024-02-18",
            method="CASH",
            funding_source=funding_objs["Personal Savings (Bachat)"]
        )
        
        # Expense 4: Bricks
        bricks_mat = material_objs["Bricks (No. 1)"]
        exp4 = Expense.objects.create(
            title="3000 Bricks for Soling",
            amount=Decimal('54000'), # 3000 * 18
            date="2024-02-20",
            category=cat_objs["Civil Works & Structure (जग र संरचना)"],
            expense_type="MATERIAL",
            phase=foundation_phase,
            material=bricks_mat,
            quantity=3000,
            unit_price=18,
            supplier=supplier_objs["Dang Bricks Industry"],
            paid_to=supplier_objs["Dang Bricks Industry"].name,
            is_paid=True,
            funding_source=funding_objs["Loan from Brother (US)"]
        )
        Payment.objects.create(
            expense=exp4,
            amount=Decimal('54000'),
            date="2024-02-20",
            method="BANK_TRANSFER",
            reference_id="IPS-332211",
            funding_source=funding_objs["Loan from Brother (US)"]
        )
        MaterialTransaction.objects.create(
             material=bricks_mat,
             transaction_type='IN',
             quantity=3000,
             unit_price=18,
             date="2024-02-20",
             supplier=supplier_objs["Dang Bricks Industry"],
             expense=exp4
        )

        self.stdout.write('Created Sample Expenses')

        # 9. Tasks for All Phases
        from apps.tasks.models import Task
        
        tasks_data = [
            # Phase 1: Planning & Design (COMPLETED)
            ("1. Planning & Design", "Naksa Design & Approval", "Architectural drawing completion", "Ram Bahadur (Civil Thekedar)", "HIGH", "COMPLETED", "2024-01-01", "2024-01-15", "2024-01-15"),
            ("1. Planning & Design", "Structural Design Approval", "Engineer certification", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "COMPLETED", "2024-01-15", "2024-01-25", "2024-01-25"),
            ("1. Planning & Design", "Municipality Permit Application", "Submit documents to Nagarpalika", None, "HIGH", "COMPLETED", "2024-01-20", "2024-02-01", "2024-02-01"),
            
            # Phase 2: Site Preparation (COMPLETED)
            ("2. Site Preparation", "Site Cleaning & Leveling", "Remove debris, level ground", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "COMPLETED", "2024-02-01", "2024-02-05", "2024-02-05"),
            ("2. Site Preparation", "Layout Marking (Dhori Thapne)", "Mark foundation boundaries", "Ram Bahadur (Civil Thekedar)", "HIGH", "COMPLETED", "2024-02-05", "2024-02-08", "2024-02-08"),
            ("2. Site Preparation", "Soil Testing & Boring", "Check soil bearing capacity", None, "CRITICAL", "COMPLETED", "2024-02-08", "2024-02-15", "2024-02-15"),
            
            # Phase 3: Foundation (IN_PROGRESS)
            ("3. Foundation (Jag)", "Excavation (Jag Khanne)", "Dig foundation trenches 4ft deep", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "COMPLETED", "2024-02-15", "2024-02-20", "2024-02-20"),
            ("3. Foundation (Jag)", "Soling & Compaction", "Brick soling with sand filling", "Ram Bahadur (Civil Thekedar)", "HIGH", "COMPLETED", "2024-02-20", "2024-02-25", "2024-02-25"),
            ("3. Foundation (Jag)", "Footing Concrete (PCC)", "Plain cement concrete base", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "IN_PROGRESS", "2024-02-25", "2024-03-05", None),
            ("3. Foundation (Jag)", "Reinforcement & Shuttering", "Steel fixing for footing", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-03-05", "2024-03-15", None),
            ("3. Foundation (Jag)", "Tie Beam & DPC", "Damp proof course installation", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-03-15", "2024-03-30", None),
            
            # Phase 4: Ground Floor Structure (PENDING)
            ("4. Ground Floor Structure", "Column Casting (Pillar)", "Raise columns to 1st floor level", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-04-01", "2024-04-15", None),
            ("4. Ground Floor Structure", "Beam Shuttering & Reinforcement", "Prepare for beam casting", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-04-15", "2024-04-25", None),
            ("4. Ground Floor Structure", "Brickwork (Itta Lagaune)", "Wall construction ground floor", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-04-25", "2024-05-05", None),
            ("4. Ground Floor Structure", "Slab Casting (Dhalan Halne)", "RCC slab for ground floor", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-05-05", "2024-05-15", None),
            
            # Phase 5: First Floor Structure (PENDING)
            ("5. First Floor Structure", "Column Raising (1st to 2nd)", "Extend columns to 2nd floor", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-05-15", "2024-05-30", None),
            ("5. First Floor Structure", "Beam & Lintel Work", "Beam casting 1st floor", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-05-30", "2024-06-10", None),
            ("5. First Floor Structure", "Brickwork 1st Floor", "Wall construction", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-06-10", "2024-06-20", None),
            ("5. First Floor Structure", "Slab Casting 1st Floor", "RCC slab work", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-06-20", "2024-06-30", None),
            
            # Phase 6: Second Floor Structure (PENDING)
            ("6. Second Floor Structure", "Column Raising (2nd to Roof)", "Final column extension", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-07-01", "2024-07-15", None),
            ("6. Second Floor Structure", "Beam Work 2nd Floor", "Beam casting", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-07-15", "2024-07-25", None),
            ("6. Second Floor Structure", "Brickwork 2nd Floor", "Wall construction", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-07-25", "2024-08-05", None),
            ("6. Second Floor Structure", "Slab Casting 2nd Floor", "Top floor slab", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-08-05", "2024-08-15", None),
            
            # Phase 7: Roofing & Top Floor (PENDING)
            ("7. Roofing & Top Floor", "Roof Truss Installation", "Steel/wooden truss work", "Ramesh Welder", "HIGH", "PENDING", "2024-08-15", "2024-08-22", None),
            ("7. Roofing & Top Floor", "Tin/Tile Roofing", "Weatherproof roofing", "Ram Bahadur (Civil Thekedar)", "CRITICAL", "PENDING", "2024-08-22", "2024-08-28", None),
            ("7. Roofing & Top Floor", "Water Tank Installation", "Overhead tank setup", "Hari Plumber", "MEDIUM", "PENDING", "2024-08-28", "2024-09-01", None),
            
            # Phase 8: Electrical & Plumbing (PENDING)
            ("8. Electrical & Plumbing", "Plumbing Rough-in", "Water supply & drainage pipes", "Hari Plumber", "HIGH", "PENDING", "2024-09-01", "2024-09-20", None),
            ("8. Electrical & Plumbing", "Electrical Conduit & Wiring", "Complete house wiring", "Shyam Electrician", "HIGH", "PENDING", "2024-09-20", "2024-10-10", None),
            ("8. Electrical & Plumbing", "Sanitary Fixtures Installation", "Toilets, sinks, fittings", "Hari Plumber", "MEDIUM", "PENDING", "2024-10-10", "2024-10-20", None),
            ("8. Electrical & Plumbing", "Electrical Panel & Meter", "Main board installation", "Shyam Electrician", "CRITICAL", "PENDING", "2024-10-20", "2024-10-30", None),
            
            # Phase 9: Finishing (PENDING)
            ("9. Finishing (Plaster/Paint)", "Internal Plastering", "Wall plastering all floors", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-11-01", "2024-11-20", None),
            ("9. Finishing (Plaster/Paint)", "External Plastering", "Outer wall finish", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-11-20", "2024-12-01", None),
            ("9. Finishing (Plaster/Paint)", "Floor Tiling", "Ceramic/marble tile work", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-12-01", "2024-12-10", None),
            ("9. Finishing (Plaster/Paint)", "Painting (Putty & Paint)", "Interior & exterior painting", "Ram Bahadur (Civil Thekedar)", "MEDIUM", "PENDING", "2024-12-10", "2024-12-20", None),
            ("9. Finishing (Plaster/Paint)", "Door & Window Installation", "Fit all doors and windows", "Ram Bahadur (Civil Thekedar)", "HIGH", "PENDING", "2024-12-20", "2024-12-25", None),
            ("9. Finishing (Plaster/Paint)", "Railing & Grill Work", "Safety railings & grills", "Ramesh Welder", "MEDIUM", "PENDING", "2024-12-25", "2024-12-30", None),
        ]
        
        for phase_name, title, desc, contractor_name, priority, status, start, due, completed in tasks_data:
            phase = phase_objs[phase_name]
            contractor = contractor_objs.get(contractor_name) if contractor_name else None
            
            Task.objects.create(
                title=title,
                description=desc,
                phase=phase,
                assigned_to=contractor,
                priority=priority,
                status=status,
                start_date=start,
                due_date=due,
                completed_date=completed
            )
        
        self.stdout.write('Created Tasks for All Phases')

        self.stdout.write(self.style.SUCCESS('Successfully seeded Tulsipur Project Data!'))

