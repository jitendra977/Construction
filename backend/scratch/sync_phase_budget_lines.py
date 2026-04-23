import os
import django
import sys
from decimal import Decimal

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.core.models import HouseProject, ConstructionPhase
from apps.accounting.models.budget import PhaseBudgetLine

def run():
    project = HouseProject.objects.get(id=4)
    if not project:
        print("Project not found")
        return

    # Clear old budget lines
    PhaseBudgetLine.objects.filter(project=project).delete()

    # Create new budget lines from phases
    phases = ConstructionPhase.objects.filter(project=project)
    
    total = Decimal('0')
    count = 0
    for phase in phases:
        PhaseBudgetLine.objects.create(
            project=project,
            phase=phase,
            budgeted_amount=phase.estimated_budget
        )
        total += phase.estimated_budget
        count += 1
        
    print(f"Successfully synced {count} PhaseBudgetLines for project {project.name}. Total: {total}")

if __name__ == "__main__":
    run()
