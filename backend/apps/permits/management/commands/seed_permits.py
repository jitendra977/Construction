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
                'description': 'Submit file with Lalpurja, Nagrikta, and Blueprint at Ward/Municipality.',
                'order': 1,
                'status': 'APPROVED'
            },
            {
                'title': '2. Jaminko Nap Jaach (Field Verification)',
                'description': 'Amin/Surveyor visits site to verify land area and boundaries (Charkilla).',
                'order': 2,
                'status': 'APPROVED'
            },
            {
                'title': '3. Rajaswa Bhuktani (Revenue Payment)',
                'description': 'Pay the calculated tax/revenue to the Municipality based on sq. ft.',
                'order': 3,
                'status': 'APPROVED'
            },
            {
                'title': '4. Asthayi Nirman Ijajat (Temporary Permit)',
                'description': 'Permission to begin construction up to Plinth (DPC) level.',
                'order': 4,
                'status': 'IN_PROGRESS'
            },
            {
                'title': '5. DPC Level Check (Technical Verification)',
                'description': 'Municipal Engineer checks setbacks and DPC height before casting.',
                'order': 5,
                'status': 'PENDING'
            },
            {
                'title': '6. Sthayi Nirman Ijajat (Permanent Permit)',
                'description': 'Approval to build the superstructure (Pillars/Slab) after DPC verification.',
                'order': 6,
                'status': 'PENDING'
            },
            {
                'title': '7. Nirman Sampanna (Completion Certificate)',
                'description': 'Final audit ensuring house matches the approved Naksha.',
                'order': 7,
                'status': 'PENDING'
            }
        ]

        for step_data in steps:
            step = PermitStep.objects.create(**step_data)
            self.stdout.write(self.style.SUCCESS(f'Created step: {step.title}'))
