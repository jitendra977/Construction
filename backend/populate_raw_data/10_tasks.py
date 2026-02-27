from datetime import date, timedelta
import random

def populate():
    from apps.tasks.models import Task
    from apps.core.models import ConstructionPhase
    from apps.resources.models import Contractor
    
    phases = list(ConstructionPhase.objects.all().order_by('order'))
    contractors = Contractor.objects.all()
    
    shyam = contractors.filter(role='THEKEDAAR').first()
    saroj = contractors.filter(role='ENGINEER').first()
    hari = contractors.filter(role='MISTRI').first()
    
    # Helper to get phase by order safely
    def get_phase(order):
        for p in phases:
            if p.order == order:
                return p
        return None

    tasks = [
        # Phase 1: Site Preparation & Mobilization
        {'title': 'Boundary Wall Marking (Chau-killa chhutyaune)', 'phase': 1, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Site Clearing & Leveling (Ghari Fadani)', 'phase': 1, 'assigned': shyam, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Temporary Shed Construction (Chhapro)', 'phase': 1, 'assigned': shyam, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Boring / Well for Water', 'phase': 1, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Temporary Electricity Setup', 'phase': 1, 'assigned': saroj, 'priority': 'HIGH', 'status': 'COMPLETED'},

        # Phase 2: Excavation & Earthwork
        {'title': 'Layout & Threading (Suta Tanne)', 'phase': 2, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Footing Excavation (Jag Khanne)', 'phase': 2, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'COMPLETED'},
        {'title': 'Underground Water Tank Excavation', 'phase': 2, 'assigned': hari, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Septic Tank Excavation', 'phase': 2, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'COMPLETED'},

        # Phase 3: Foundation & DPC
        {'title': 'PCC Laying in Footings', 'phase': 3, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'IN_PROGRESS'},
        {'title': 'Rebar Laying for Footing & Column Starter (Jali Bannne)', 'phase': 3, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'IN_PROGRESS'},
        {'title': 'Footing Casting (Dhalan)', 'phase': 3, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Foundation Wall (Gahro) to Plinth Level', 'phase': 3, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Plinth Beam Rebar & Casting', 'phase': 3, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'DPC (Damp Proof Course) Laying', 'phase': 3, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Backfilling Earth in Foundation (Mato Purne)', 'phase': 3, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 4: Superstructure - Ground Floor
        {'title': 'GF Column Rebar Extension & Tying', 'phase': 4, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Column Formwork (Farmabandi)', 'phase': 4, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'GF Column Casting (Dhalan)', 'phase': 4, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Brick Masonry (9" and 4" Gahro)', 'phase': 4, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'GF Lintel / Sill Band Casting', 'phase': 4, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'GF Slab Centering & Formwork', 'phase': 4, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Slab Rebar Tying & Electrical Layout', 'phase': 4, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'GF Slab Casting (Roof Dhalan)', 'phase': 4, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},

        # Phase 5: Superstructure - First Floor
        {'title': 'FF Column Rebar & Casting', 'phase': 5, 'assigned': shyam, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'FF Brick Masonry', 'phase': 5, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'FF Lintel Casting', 'phase': 5, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'FF Slab Centering, Rebar & Electrical Layout', 'phase': 5, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'FF Slab Casting', 'phase': 5, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},

        # Phase 6: Top Floor/Staircase
        {'title': 'Staircase Rebar & Casting', 'phase': 6, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Top Floor / Parapet Wall Masonry', 'phase': 6, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Water Tank Stand / Truss Structure', 'phase': 6, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 7: Finishing - Plaster
        {'title': 'Internal Ceiling Plaster', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Internal Wall Plaster', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Exterior Wall Plaster (Bahira ko Plaster)', 'phase': 7, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Curing of Plaster', 'phase': 7, 'assigned': shyam, 'priority': 'LOW', 'status': 'PENDING'},

        # Phase 8: Finishing - Flooring
        {'title': 'Floor Leveling & Screeding', 'phase': 8, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Marble/Tile Laying in Rooms', 'phase': 8, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Bathroom Waterproofing & Tiles', 'phase': 8, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Kitchen Platform (Granite) & Dado Tiles', 'phase': 8, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Staircase Marble & Skirting', 'phase': 8, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},

        # Phase 9: MEP
        {'title': 'Wall Chipping for Concealed Wiring', 'phase': 9, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Electrical Wire Pulling in Conduits', 'phase': 9, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Plumbing Pipe Layout (Pani ko Pipe)', 'phase': 9, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Switchboard & Socket Fixing', 'phase': 9, 'assigned': saroj, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Sanitary Fittings (Commode, Tap, Basin)', 'phase': 9, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},

        # Phase 10: Interior & Woodwork
        {'title': 'Chaukath (Door/Window Frame) Fixing', 'phase': 10, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Wall Putty / Primer Application', 'phase': 10, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'False Ceiling (POP/Gypsum)', 'phase': 10, 'assigned': saroj, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Door / Window Panel Installation', 'phase': 10, 'assigned': shyam, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'First Coat Painting', 'phase': 10, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},

        # Phase 11: Exterior & Landscaping
        {'title': 'Main Gate Fabrication & Installation', 'phase': 11, 'assigned': saroj, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Boundary Wall Plaster & Painting', 'phase': 11, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Exterior Painting (Weather Coat)', 'phase': 11, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Paving / Tiles in Parking Area', 'phase': 11, 'assigned': shyam, 'priority': 'LOW', 'status': 'PENDING'},

        # Phase 12: Final Handover
        {'title': 'Final Coat Painting / Touchups', 'phase': 12, 'assigned': hari, 'priority': 'HIGH', 'status': 'PENDING'},
        {'title': 'Electrical & Plumbing Testing', 'phase': 12, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
        {'title': 'Deep Cleaning of Site', 'phase': 12, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'PENDING'},
        {'title': 'Handover Documentation & Keys', 'phase': 12, 'assigned': saroj, 'priority': 'CRITICAL', 'status': 'PENDING'},
    ]

    count = 0
    for t_data in tasks:
        phase_obj = get_phase(t_data['phase'])
        if phase_obj:
            
            # Start dates logic based on phase progression
            start_offset = (t_data['phase'] - 1) * 30
            if t_data['status'] == 'COMPLETED':
                calc_start = date.today() - timedelta(days=start_offset + 15)
            elif t_data['status'] == 'IN_PROGRESS':
                calc_start = date.today() - timedelta(days=2)
            else:
                calc_start = date.today() + timedelta(days=start_offset)

            task, created = Task.objects.get_or_create(
                title=t_data['title'],
                phase=phase_obj,
                defaults={
                    'assigned_to': t_data['assigned'],
                    'priority': t_data['priority'],
                    'status': t_data['status'],
                    'start_date': calc_start
                }
            )
            if created:
                count += 1
                print(f"Created task: {task.title}")
            else:
                # Update status of existing ones to match our new script logic
                if task.status != t_data['status'] or task.assigned_to != t_data['assigned']:
                    task.status = t_data['status']
                    task.assigned_to = t_data['assigned']
                    task.save()
    
    print(f"Total tasks processed. Created {count} new tasks.")

if __name__ == '__main__':
    populate()
