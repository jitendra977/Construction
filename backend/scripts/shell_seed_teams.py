from apps.teams.models import Team
from apps.attendance.models import AttendanceWorker
from apps.core.models import HouseProject

def seed_teams():
    project = HouseProject.objects.get(id=3)
    print(f"Seeding teams for project: {project.name}")

    raw_teams = [
        {
            "name": "Structural Core Team",
            "description": "Primary team for RCC, masonry and heavy lifting. Led by head mistris.",
            "trades": ["MISTRI", "LABOUR"]
        },
        {
            "name": "Electrical & Wiring Force",
            "description": "Specialized electricians for house wiring and phase management.",
            "trades": ["ELECTRICIAN"]
        },
        {
            "name": "Plumbing & Sanitary Squad",
            "description": "Responsible for pipeline laying, tank installation, and bathroom fittings.",
            "trades": ["PLUMBER"]
        },
        {
            "name": "Finishing & Paint Crew",
            "description": "Expert painters and wall finishers for interior/exterior work.",
            "trades": ["PAINTER"]
        }
    ]

    for data in raw_teams:
        team, created = Team.objects.get_or_create(
            project=project,
            name=data["name"],
            defaults={"description": data["description"]}
        )
        
        if created:
            print(f"Created team: {team.name}")
            workers = AttendanceWorker.objects.filter(project=project, trade__in=data["trades"])[:5]
            if workers.exists():
                team.members.add(*workers)
                print(f"  Added {workers.count()} workers to {team.name}")
        else:
            print(f"Team {team.name} already exists.")

seed_teams()
