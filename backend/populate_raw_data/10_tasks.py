from datetime import date, timedelta

def populate():
    from apps.tasks.models import Task
    from apps.core.models import ConstructionPhase, Room
    from apps.resources.models import Contractor
    
    phases = ConstructionPhase.objects.all()
    rooms = Room.objects.all()
    contractors = Contractor.objects.all()
    
    shyam = contractors.filter(role='THEKEDAAR').first()
    saroj = contractors.filter(role='ENGINEER').first()
    hari = contractors.filter(role='MISTRI').first()
    
    # Sample tasks for Phase 1 & 2
    phase1 = phases.filter(order=1).first()
    phase2 = phases.filter(order=2).first()
    
    tasks = [
        {'title': 'Boundary Wall Marking', 'phase': phase1, 'assigned': saroj, 'priority': 'HIGH', 'status': 'COMPLETED'},
        {'title': 'Temporary Shed Construction', 'phase': phase1, 'assigned': shyam, 'priority': 'MEDIUM', 'status': 'COMPLETED'},
        {'title': 'Footing Excavation', 'phase': phase2, 'assigned': hari, 'priority': 'CRITICAL', 'status': 'IN_PROGRESS'},
        {'title': 'Underground Tank Digging', 'phase': phase2, 'assigned': hari, 'priority': 'MEDIUM', 'status': 'PENDING'},
    ]

    for t_data in tasks:
        if t_data['phase']:
            task, created = Task.objects.get_or_create(
                title=t_data['title'],
                phase=t_data['phase'],
                defaults={
                    'assigned_to': t_data['assigned'],
                    'priority': t_data['priority'],
                    'status': t_data['status'],
                    'start_date': date.today() - timedelta(days=10)
                }
            )
            if created:
                print(f"Created task: {task.title}")

if __name__ == '__main__':
    populate()
