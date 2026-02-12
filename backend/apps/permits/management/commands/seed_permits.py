from django.core.management.base import BaseCommand
from apps.permits.models import PermitStep

class Command(BaseCommand):
    help = 'Seeds realistic Permit steps for Nepal Construction (Naksha Pass)'

    def handle(self, *args, **options):
        # Clear existing steps to avoid duplicates or order conflicts during re-seed
        PermitStep.objects.all().delete()
        self.stdout.write(self.style.WARNING('Cleared existing permit steps.'))

        steps = [
            {
                'title': '1. Darta / Chalani (File Registration)',
                'description': 'Submit application file at Tulsipur Sub-Metropolitan City Engineering Section with: Lalpurja (Land Certificate), Citizenship, Tax Clearance (Tiro Rasid), Site Plan, and Architectural Drawings.',
                'order': 1,
                'status': 'APPROVED',
                'date_issued': '2024-01-05',
                'notes': 'File No: TSM/ENG/2024/001. Submitted at Ward Office No. 6.'
            },
            {
                'title': '2. Jaminko Nap Jaach (Field Verification)',
                'description': 'Municipal Surveyor (Amin) visits site to verify land boundaries (Charkilla), measure actual area, and confirm setback requirements as per Tulsipur building bylaws.',
                'order': 2,
                'status': 'APPROVED',
                'date_issued': '2024-01-10',
                'notes': 'Surveyor: Ram Kumar Khadka. Verified 5 Aana land. Setback: 5ft front, 3ft sides confirmed.'
            },
            {
                'title': '3. Naksa Jaach (Blueprint Verification)',
                'description': 'Structural Engineer reviews architectural and structural drawings for compliance with Nepal National Building Code (NBC) and local bylaws. Checks load calculations, foundation design, and safety measures.',
                'order': 3,
                'status': 'APPROVED',
                'date_issued': '2024-01-18',
                'notes': 'Approved by Er. Dinesh Sharma (License No: 8765-Civil). Minor corrections made to staircase width.'
            },
            {
                'title': '4. Rajaswa Bhuktani (Revenue Payment)',
                'description': 'Pay construction tax/revenue to Municipality Treasury based on building area (Rs. 150 per sq.ft for residential). Includes: Building Permit Fee, Sanitation Fee, and Development Charge.',
                'order': 4,
                'status': 'APPROVED',
                'date_issued': '2024-01-20',
                'notes': 'Total Paid: Rs. 45,000 (2500 sqft × Rs. 18/sqft). Receipt No: TSM/REV/2024/0089'
            },
            {
                'title': '5. Asthayi Nirman Ijajat (Temporary Construction Permit)',
                'description': 'Permission to begin foundation work up to Plinth/DPC level. Valid for 3 months. Must display permit board at site entrance.',
                'order': 5,
                'status': 'APPROVED',
                'date_issued': '2024-02-01',
                'notes': 'Permit No: TSM/2024/001. Valid until 2024-05-01. Site board installed.'
            },
            {
                'title': '6. DPC Level Jaach (Plinth Level Inspection)',
                'description': 'Municipal Engineer inspects foundation, plinth height (minimum 18 inches above ground), and verifies setbacks before allowing superstructure construction.',
                'order': 6,
                'status': 'IN_PROGRESS',
                'date_issued': None,
                'notes': 'Inspection scheduled for 2024-03-05. Engineer: Er. Prakash Thapa'
            },
            {
                'title': '7. Sthayi Nirman Ijajat (Permanent Construction Permit)',
                'description': 'Final approval to build superstructure (columns, beams, slabs) after successful DPC inspection. Includes approval for roofing and finishing work.',
                'order': 7,
                'status': 'PENDING',
                'date_issued': None,
                'notes': 'Requires DPC inspection clearance first'
            },
            {
                'title': '8. Slab Casting Jaach (Floor Slab Inspection)',
                'description': 'Optional inspection at each floor level to verify column alignment, beam reinforcement, and slab thickness as per approved drawings.',
                'order': 8,
                'status': 'PENDING',
                'date_issued': None,
                'notes': 'Required for buildings above 3 floors or commercial structures'
            },
            {
                'title': '9. Nirman Sampanna Praman Patra (Completion Certificate)',
                'description': 'Final inspection after construction completion. Verifies building matches approved Naksa, proper drainage, fire safety, and structural integrity. Required for electricity and water connection.',
                'order': 9,
                'status': 'PENDING',
                'date_issued': None,
                'notes': 'Apply within 6 months of construction completion. Fee: Rs. 5,000'
            },
            {
                'title': '10. Occupancy Certificate (Basne Swikrit)',
                'description': 'Final clearance from Municipality certifying building is safe for occupation. Required for property registration and bank loan documentation.',
                'order': 10,
                'status': 'PENDING',
                'date_issued': None,
                'notes': 'Issued after Completion Certificate and utility connections'
            }
        ]

        # Create permit steps
        created_steps = {}
        for step_data in steps:
            step = PermitStep.objects.create(**step_data)
            created_steps[step.order] = step
            self.stdout.write(self.style.SUCCESS(f'Created step: {step.title}'))

        # Create sample documents for each permit step
        from apps.resources.models import Document
        from django.core.files.base import ContentFile
        
        # Clear existing documents to avoid duplicates
        Document.objects.filter(document_type__in=['LALPURJA', 'PERMIT', 'NAKSHA']).delete()
        
        documents_data = [
            # Step 1: File Registration
            {
                'step_order': 1,
                'title': 'Lalpurja (Land Certificate)',
                'document_type': 'LALPURJA',
                'description': '5 Aana land ownership certificate from Land Revenue Office'
            },
            {
                'step_order': 1,
                'title': 'Citizenship Certificate',
                'document_type': 'OTHER',
                'description': 'Owner citizenship certificate (Jitendra Khadka)'
            },
            {
                'step_order': 1,
                'title': 'Tax Clearance (Tiro Rasid)',
                'document_type': 'OTHER',
                'description': 'Property tax clearance certificate from municipality'
            },
            # Step 2: Field Verification
            {
                'step_order': 2,
                'title': 'Site Survey Report',
                'document_type': 'OTHER',
                'description': 'Field verification report by Surveyor Ram Kumar Khadka'
            },
            {
                'step_order': 2,
                'title': 'Charkilla (Boundary Map)',
                'document_type': 'OTHER',
                'description': 'Land boundary map with neighbor signatures'
            },
            # Step 3: Blueprint Verification
            {
                'step_order': 3,
                'title': 'Architectural Drawing',
                'document_type': 'NAKSHA',
                'description': '3-floor residential building architectural plan'
            },
            {
                'step_order': 3,
                'title': 'Structural Design',
                'document_type': 'NAKSHA',
                'description': 'Structural engineering drawings by Er. Dinesh Sharma'
            },
            {
                'step_order': 3,
                'title': 'Engineer Approval Letter',
                'document_type': 'PERMIT',
                'description': 'Structural safety certification (License No: 8765-Civil)'
            },
            # Step 4: Revenue Payment
            {
                'step_order': 4,
                'title': 'Revenue Receipt',
                'document_type': 'OTHER',
                'description': 'Payment receipt Rs. 45,000 (Receipt No: TSM/REV/2024/0089)'
            },
            # Step 5: Temporary Permit
            {
                'step_order': 5,
                'title': 'Asthayi Nirman Ijajat',
                'document_type': 'PERMIT',
                'description': 'Temporary construction permit (Permit No: TSM/2024/001)'
            },
            {
                'step_order': 5,
                'title': 'Site Board Photo',
                'document_type': 'PHOTO',
                'description': 'Photo of permit board displayed at construction site'
            },
        ]
        
        for doc_data in documents_data:
            step_order = doc_data.pop('step_order')
            
            # Create a dummy file (in production, these would be actual uploaded files)
            dummy_content = ContentFile(f"Sample document: {doc_data['title']}")
            
            doc = Document.objects.create(
                title=doc_data['title'],
                document_type=doc_data['document_type'],
                description=doc_data['description']
            )
            # Save with a dummy filename
            doc.file.save(f"{doc_data['title'].replace(' ', '_').lower()}.pdf", dummy_content, save=True)
            
            # Attach document to permit step
            created_steps[step_order].documents.add(doc)
            
            self.stdout.write(self.style.SUCCESS(f'  → Attached document: {doc.title} to Step {step_order}'))
        
        self.stdout.write(self.style.SUCCESS('\n✅ Permit steps and documents seeded successfully!'))
