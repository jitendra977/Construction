from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from apps.core.models import HouseProject, ProjectMember
from apps.resources.models import Contractor
from apps.attendance.models import AttendanceWorker
from apps.workforce.models import Team, WorkforceMember
from decimal import Decimal
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds human-related data: Users, Contractors, Workers, and Teams'

    @transaction.atomic
    def handle(self, *args, **options):
        project = HouseProject.objects.first()
        if not project:
            self.stdout.write(self.style.ERROR('No project found. Run seed_jitu_project first.'))
            return

        self.stdout.write(f'🌱 Seeding humans for project: {project.name}')

        # 1. Create some Users/Managers
        managers_data = [
            ('ram_pm', 'ram@example.com', 'Ram Bahadur', 'Project Manager', 'MANAGER'),
            ('shyam_eng', 'shyam@example.com', 'Shyam Sharma', 'Civil Engineer', 'ENGINEER'),
            ('hari_sup', 'hari@example.com', 'Hari Prasad', 'Site Supervisor', 'SUPERVISOR'),
        ]
        
        users = {}
        for username, email, name, note, role in managers_data:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': name.split()[0],
                    'last_name': name.split()[1],
                    'is_active': True,
                    'is_verified': True,
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            
            # Create ProjectMember
            member, _ = ProjectMember.objects.get_or_create(
                project=project,
                user=user,
                defaults={'role': role, 'note': note}
            )
            member.apply_role_defaults()
            member.save()
            
            users[username] = user
            self.stdout.write(f'  👤 User: {name} ({role})')

        # 2. Create Contractors
        contractors_data = [
            ('Kaji Mistri', 'THEKEDAAR', '9851011222', 2500, 150000),
            ('Sita Masonry', 'MISTRI', '9841033444', 1200, 0),
            ('Deepak Electric', 'ELECTRICIAN', '9801055666', 1500, 85000),
        ]
        
        contractors = []
        for name, role, phone, daily, rate in contractors_data:
            contractor, _ = Contractor.objects.update_or_create(
                name=name,
                project=project,
                defaults={
                    'role': role,
                    'phone': phone,
                    'daily_wage': Decimal(str(daily)),
                    'rate': Decimal(str(rate)) if rate > 0 else None,
                    'is_active': True,
                }
            )
            contractors.append(contractor)
            self.stdout.write(f'  🏗️ Contractor: {name} ({role})')

        # 3. Create Attendance Workers (The Labours)
        workers_data = [
            ('Ganesh Lama', 'MASON', 1100),
            ('Bharat Rai', 'MASON', 1100),
            ('Sunil Tamang', 'HELPER', 800),
            ('Prakash BK', 'HELPER', 800),
            ('Rajesh Magar', 'HELPER', 850),
            ('Manoj Gurung', 'CARPENTER', 1300),
            ('Bikash Thapa', 'ELECTRICIAN', 1200),
        ]
        
        attendance_workers = []
        for name, trade, rate in workers_data:
            worker, _ = AttendanceWorker.objects.update_or_create(
                name=name,
                project=project,
                defaults={
                    'trade': trade,
                    'worker_type': 'LABOUR',
                    'daily_rate': Decimal(str(rate)),
                    'is_active': True,
                }
            )
            attendance_workers.append(worker)
            self.stdout.write(f'  👷 Worker: {name} ({trade})')

        # 4. Create WorkforceMember records linked to AttendanceWorkers
        for aw in attendance_workers:
            name_parts = aw.name.strip().rsplit(' ', 1)
            WorkforceMember.objects.get_or_create(
                attendance_worker=aw,
                defaults=dict(
                    _first_name=name_parts[0],
                    _last_name=name_parts[1] if len(name_parts) > 1 else '',
                    status='ACTIVE',
                    worker_type=aw.worker_type,
                    _phone=aw.phone,
                    current_project=project,
                    join_date=aw.joined_date or project.start_date,
                ),
            )

        # 5. Create Teams — leader and members are now WorkforceMember
        teams_data = [
            ('Masonry Team A',   'Core structure wall builders', ['Ganesh Lama', 'Bharat Rai', 'Sunil Tamang']),
            ('Finishing Support','Helpers for finishing work',   ['Prakash BK', 'Rajesh Magar']),
            ('Technical Team',   'Specialized trades',           ['Bikash Thapa', 'Manoj Gurung']),
        ]

        for t_name, desc, member_names in teams_data:
            # Resolve WorkforceMember via the linked AttendanceWorker name
            wf_members = WorkforceMember.objects.filter(
                attendance_worker__name__in=member_names,
                current_project=project,
            )
            leader = WorkforceMember.objects.filter(
                attendance_worker__name=member_names[0],
                current_project=project,
            ).first()

            team, _ = Team.objects.get_or_create(
                project=project,
                name=t_name,
                defaults={'description': desc, 'leader': leader, 'is_active': True},
            )
            team.members.set(wf_members)
            self.stdout.write(f'  👥 Team: {t_name} ({wf_members.count()} members)')

        self.stdout.write(self.style.SUCCESS('✅ Human data seeding complete!'))
