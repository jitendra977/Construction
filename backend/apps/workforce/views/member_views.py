from rest_framework import viewsets, filters, status, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import render
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from ..models import WorkforceMember
from ..serializers import WorkforceMemberSerializer, WorkforceMemberListSerializer
from ..utils.badge_utils import generate_qr_base64


class WorkforceMemberViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = WorkforceMember.objects.select_related(
        'account', 'role', 'current_project', 'attendance_worker'
    ).all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['worker_type', 'role', 'status', 'current_project']
    # Use actual DB column names (properties _first_name, _last_name etc. map to these)
    search_fields = ['_first_name', '_last_name', 'employee_id', '_phone', '_email']
    ordering_fields = ['join_date', '_first_name', '_last_name']

    def get_serializer_class(self):
        if self.action == 'list':
            return WorkforceMemberListSerializer
        return WorkforceMemberSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['get'])
    def full_profile(self, request, pk=None):
        """Return the complete detailed profile with all nested relations."""
        member = self.get_object()
        serializer = WorkforceMemberSerializer(member)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary_stats(self, request):
        """Return summary counts for dashboard widgets."""
        from apps.attendance.models import AttendanceWorker

        project = request.query_params.get('project')
        qs = self.get_queryset()
        unlinked_attendance_qs = AttendanceWorker.objects.filter(
            workforce_member__isnull=True,
        )
        if project:
            qs = qs.filter(current_project=project)
            unlinked_attendance_qs = unlinked_attendance_qs.filter(project_id=project)
        data = {
            'total':      qs.count(),
            'active':     qs.filter(status='ACTIVE').count(),
            'on_leave':   qs.filter(status='ON_LEAVE').count(),
            'inactive':   qs.filter(status__in=['INACTIVE', 'TERMINATED', 'SUSPENDED']).count(),
            'staff':      qs.filter(worker_type='STAFF').count(),
            'labour':     qs.filter(worker_type='LABOUR').count(),
            'linked':     qs.filter(attendance_worker__isnull=False).count(),
            'unlinked':   unlinked_attendance_qs.count(),
        }
        return Response(data)

    @xframe_options_exempt
    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def badge(self, request, pk=None):
        """
        GET /api/v1/workforce/members/{id}/badge/
        Renders a printable ID card (badge) for the worker.

        Security: requires authentication (IsAuthenticated, not AllowAny).
        The badge contains the worker's QR token which doubles as an attendance
        check-in credential — exposing it publicly would allow anyone who knows
        a worker's ID to spoof their attendance record.
        """
        member = self.get_object()
        
        # Determine what data to put in the QR code
        # We prefer the AttendanceWorker's qr_token if it exists,
        # otherwise we fallback to the employee_id.
        qr_data = member.employee_id
        if member.attendance_worker and member.attendance_worker.qr_token:
            qr_data = member.attendance_worker.qr_token
            
        qr_code_base64 = generate_qr_base64(qr_data)
        
        context = {
            'member': member,
            'qr_code_base64': qr_code_base64,
        }
        
        return render(request, 'workforce/worker_badge.html', context)

    @action(detail=True, methods=['post'], url_path='upload_photo')
    def upload_photo(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/upload_photo/
        Accepts multipart/form-data with a 'photo' file field.
        Saves it to the member's _photo column and returns the new photo URL.
        """
        member = self.get_object()
        photo = request.FILES.get('photo')
        if not photo:
            return Response({'error': 'No photo file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate: images only
        if not photo.content_type.startswith('image/'):
            return Response({'error': 'File must be an image.'}, status=status.HTTP_400_BAD_REQUEST)

        # Max 5 MB
        if photo.size > 5 * 1024 * 1024:
            return Response({'error': 'Image must be under 5 MB.'}, status=status.HTTP_400_BAD_REQUEST)

        member._photo = photo
        member.save(update_fields=['_photo'])

        photo_url = request.build_absolute_uri(member._photo.url) if member._photo else None
        return Response({'photo_url': photo_url}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def link_attendance(self, request, pk=None):
        """
        Link a WorkforceMember to an existing AttendanceWorker.
        Body: { "attendance_worker_id": <int> }
        """
        from apps.attendance.models import AttendanceWorker

        member = self.get_object()
        aw_id = request.data.get('attendance_worker_id')
        if not aw_id:
            return Response({'error': 'attendance_worker_id is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            aw = AttendanceWorker.objects.get(pk=aw_id)
        except AttendanceWorker.DoesNotExist:
            return Response({'error': 'AttendanceWorker not found.'}, status=status.HTTP_404_NOT_FOUND)

        if hasattr(aw, 'workforce_member') and aw.workforce_member and aw.workforce_member != member:
            return Response(
                {'error': 'This AttendanceWorker is already linked to another WorkforceMember.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        member.attendance_worker = aw
        member.save(update_fields=['attendance_worker', 'updated_at'])
        return Response({'status': 'linked', 'attendance_worker': aw_id})

    @action(detail=True, methods=['post'])
    def unlink_attendance(self, request, pk=None):
        """Remove the AttendanceWorker link from a WorkforceMember."""
        member = self.get_object()
        member.attendance_worker = None
        member.save(update_fields=['attendance_worker', 'updated_at'])
        return Response({'status': 'unlinked'})

    @action(detail=True, methods=['post'])
    def sync_attendance(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/sync_attendance/
        Finds or creates an AttendanceWorker for this member and links them.
        Safe to call multiple times — idempotent.
        """
        from apps.attendance.models import AttendanceWorker
        from apps.workforce.models.categories import WorkforceRole

        member = self.get_object()

        # Already linked — return existing
        if member.attendance_worker_id:
            aw = member.attendance_worker
            return Response({
                'status': 'already_linked',
                'attendance_worker_id': aw.id,
                'qr_token': str(aw.qr_token),
            })

        # Need a project to create AttendanceWorker
        project = member.current_project
        if not project:
            return Response(
                {'error': 'Member has no project assigned. Assign to a project first.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Map WorkforceMember.worker_type → AttendanceWorker.worker_type
        wtype_map = {
            'LABOUR': 'LABOUR', 'STAFF': 'STAFF',
            'SUBCONTRACTOR': 'LABOUR', 'FREELANCE': 'LABOUR',
        }
        aw_type = wtype_map.get(member.worker_type, 'LABOUR')

        # Map WorkforceRole.trade_code → AttendanceWorker.trade
        trade = 'OTHER'
        if member.role and member.role.trade_code:
            trade = member.role.trade_code

        # Check if an orphan AttendanceWorker with the same name exists for this project
        aw = AttendanceWorker.objects.filter(
            project=project,
            name=member.full_name,
            workforce_member__isnull=True,
        ).first()

        if not aw:
            aw = AttendanceWorker.objects.create(
                project=project,
                name=member.full_name,
                trade=trade,
                worker_type=aw_type,
                phone=member.phone or '',
                address=member.address or '',
                linked_user=member.account,
                joined_date=member.join_date,
                is_active=(member.status == 'ACTIVE'),
            )

        member.attendance_worker = aw
        member.save(update_fields=['attendance_worker', 'updated_at'])

        return Response({
            'status': 'created' if not aw.pk else 'linked',
            'attendance_worker_id': aw.id,
            'qr_token': str(aw.qr_token),
        })

    @action(detail=False, methods=['post'])
    def sync_all_attendance(self, request):
        """
        POST /api/v1/workforce/members/sync_all_attendance/
        Body: { "project": "<project_id>" }
        Sync ALL unlinked members in a project — creates AttendanceWorkers for each.
        """
        from django.db.models import Q
        from apps.attendance.models import AttendanceWorker

        project_id = request.data.get('project') or request.query_params.get('project')
        if not project_id:
            return Response({'error': 'project is required.'}, status=status.HTTP_400_BAD_REQUEST)

        from apps.core.models import HouseProject
        try:
            project = HouseProject.objects.get(pk=project_id)
        except HouseProject.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)

        unlinked = WorkforceMember.objects.filter(
            Q(current_project=project) | Q(current_project__isnull=True),
            attendance_worker__isnull=True,
        ).select_related('role', 'account')

        wtype_map = {
            'LABOUR': 'LABOUR', 'STAFF': 'STAFF',
            'SUBCONTRACTOR': 'LABOUR', 'FREELANCE': 'LABOUR',
        }

        created = 0
        linked = 0
        for member in unlinked:
            aw_type = wtype_map.get(member.worker_type, 'LABOUR')
            trade = 'OTHER'
            if member.role and member.role.trade_code:
                trade = member.role.trade_code

            # Look for orphan first
            aw = AttendanceWorker.objects.filter(
                project=project,
                name=member.full_name,
                workforce_member__isnull=True,
            ).first()

            if aw:
                linked += 1
            else:
                aw = AttendanceWorker.objects.create(
                    project=project,
                    name=member.full_name,
                    trade=trade,
                    worker_type=aw_type,
                    phone=member.phone or '',
                    address=member.address or '',
                    linked_user=member.account,
                    joined_date=member.join_date,
                    is_active=(member.status == 'ACTIVE'),
                )
                created += 1

            member.attendance_worker = aw
            if member.current_project_id != project.id:
                member.current_project = project
            member.save(update_fields=['attendance_worker', 'current_project', 'updated_at'])

        return Response({
            'status': 'ok',
            'created': created,
            'linked': linked,
            'total_synced': created + linked,
        })

    @action(detail=True, methods=['post'])
    def mark_today(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/mark_today/
        Body: { "status": "PRESENT|ABSENT|HALF_DAY|LEAVE|HOLIDAY",
                "date": "YYYY-MM-DD",   (optional, defaults today)
                "check_in": "HH:MM",    (optional)
                "check_out": "HH:MM",   (optional)
                "notes": "...",         (optional)
                "auto_sync": true }     (create AttendanceWorker if missing)
        Marks attendance for a member. Creates AttendanceWorker if auto_sync=true.
        """
        from apps.attendance.models import AttendanceWorker, DailyAttendance
        from django.utils import timezone as tz
        import datetime

        member = self.get_object()
        mark_status = request.data.get('status', 'PRESENT')
        date_str = request.data.get('date')
        check_in = request.data.get('check_in') or None
        check_out = request.data.get('check_out') or None
        notes = request.data.get('notes', '')
        auto_sync = request.data.get('auto_sync', True)

        # Parse date
        if date_str:
            try:
                record_date = datetime.date.fromisoformat(date_str)
            except ValueError:
                return Response({'error': 'Invalid date format. Use YYYY-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            record_date = tz.localdate()

        # Auto-sync attendance worker if missing
        if not member.attendance_worker_id:
            if not auto_sync:
                return Response({'error': 'Member is not linked to an AttendanceWorker.'}, status=status.HTTP_400_BAD_REQUEST)

            project = member.current_project
            if not project:
                return Response({'error': 'Member has no project. Assign to a project first.'}, status=status.HTTP_400_BAD_REQUEST)

            wtype_map = {'LABOUR': 'LABOUR', 'STAFF': 'STAFF', 'SUBCONTRACTOR': 'LABOUR', 'FREELANCE': 'LABOUR'}
            trade = (member.role.trade_code if member.role and member.role.trade_code else 'OTHER')

            aw = AttendanceWorker.objects.filter(
                project=project, name=member.full_name, workforce_member__isnull=True,
            ).first()
            if not aw:
                aw = AttendanceWorker.objects.create(
                    project=project,
                    name=member.full_name,
                    trade=trade,
                    worker_type=wtype_map.get(member.worker_type, 'LABOUR'),
                    phone=member.phone or '',
                    linked_user=member.account,
                    joined_date=member.join_date,
                    is_active=(member.status == 'ACTIVE'),
                )
            member.attendance_worker = aw
            member.save(update_fields=['attendance_worker', 'updated_at'])

        aw = member.attendance_worker

        # Upsert daily attendance
        record, created = DailyAttendance.objects.update_or_create(
            worker=aw,
            date=record_date,
            defaults={
                'project': aw.project,
                'status': mark_status,
                'check_in': check_in,
                'check_out': check_out,
                'notes': notes,
                'recorded_by': request.user,
            },
        )

        return Response({
            'status': 'ok',
            'attendance_id': record.id,
            'date': str(record_date),
            'attendance_status': record.status,
            'attendance_worker_id': aw.id,
            'created': created,
        })

    @action(detail=True, methods=['post'])
    def assign_project(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/assign_project/
        Body: { "project_id": <int> }   — set current_project
              {}  or { "project_id": null } — clear current_project

        This is the unified hook for linking a worker to a project.
        Once linked, the worker appears in:
          - dashboardData.contractors (task assignment dropdown)
          - PhaseDetailPanel workforce tab (phase worker select)
          - ProjectTeam > Workers tab (WorkforceMembersView)
          - WorkforceHub filtered by project
        """
        from apps.core.models import HouseProject
        member = self.get_object()
        project_id = request.data.get('project_id')
        if project_id:
            try:
                project = HouseProject.objects.get(pk=project_id)
            except HouseProject.DoesNotExist:
                return Response({'error': 'Project not found.'}, status=status.HTTP_404_NOT_FOUND)
            member.current_project = project
        else:
            member.current_project = None
        member.save(update_fields=['current_project', 'updated_at'])
        return Response({
            'status': 'ok',
            'current_project': project_id,
            'member_id': str(member.id),
            'full_name': member.full_name,
        })

    @action(detail=True, methods=['post'])
    def create_account(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/create_account/

        Creates a User account for a WorkforceMember. Worker Portal uses
        phone + PIN. Optional admin access uses email + generated password
        and the selected accounts.Role permissions.

        Body (all optional):
            phone  — overrides stored phone
            pin    — 4-6 digit PIN; auto-generated if omitted
            email  — optional email address
            admin_access — true to allow dashboard/admin panel login
            role_id — accounts.Role id used when admin_access is true

        Returns generated credentials ONCE only.
        """
        import random, string, re
        from django.contrib.auth import get_user_model
        from django.utils.crypto import get_random_string
        from apps.accounts.models import Role

        User   = get_user_model()
        member = self.get_object()

        if member.account:
            return Response(
                {'error': 'This member already has an account.',
                 'username': member.account.username},
                status=status.HTTP_400_BAD_REQUEST,
            )

        phone = (request.data.get('phone') or member.phone or '').strip()
        phone = re.sub(r'[^\d\+]', '', phone)
        admin_access = bool(request.data.get('admin_access', False))
        
        if not phone:
            return Response(
                {'error': 'Phone number is required to create an account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if User.objects.filter(username=phone).exists():
            return Response(
                {'error': f'An account already exists for phone {phone}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        raw_pin = str(request.data.get('pin') or '').strip()
        if not raw_pin:
            raw_pin = ''.join(random.choices(string.digits, k=6))
        if not raw_pin.isdigit() or len(raw_pin) < 4 or len(raw_pin) > 6:
            return Response(
                {'error': 'PIN must be 4-6 digits.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = request.data.get('email') or member.email or f'{phone}@worker.local'
        email = str(email).strip().lower()
        if User.objects.filter(email=email).exists():
            return Response(
                {'error': f'An account already exists for email {email}.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        role = None
        raw_password = None
        if admin_access:
            role_id = request.data.get('role_id')
            if not role_id:
                return Response(
                    {'error': 'role_id is required when admin_access is enabled.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                role = Role.objects.get(pk=role_id)
            except Role.DoesNotExist:
                return Response({'error': 'Role not found.'}, status=status.HTTP_404_NOT_FOUND)
            raw_password = request.data.get('password') or get_random_string(14)

        user = User.objects.create_user(
            username=phone,
            email=email,
            password=raw_password or None,
            first_name=member.first_name,
            last_name=member.last_name,
            role=role,
            is_staff=admin_access,
            is_active=True,
        )
        if not admin_access:
            user.set_unusable_password()
        if hasattr(user, 'phone_number'):
            user.phone_number = phone
        update_fields = ['password', 'phone_number'] if hasattr(user, 'phone_number') else ['password']
        if admin_access:
            update_fields.extend(['role', 'is_staff'])
        user.save(update_fields=update_fields)

        member.account = user
        member._phone  = phone
        member.set_portal_pin(raw_pin)
        member.save(update_fields=['account', '_phone', 'portal_pin_hash', 'updated_at'])

        return Response({
            'message':     f'Account created for {member.full_name}.',
            'employee_id': member.employee_id,
            'username':    phone,
            'pin':         raw_pin,
            'email':       email,
            'admin_access': admin_access,
            'admin_username': email if admin_access else None,
            'password': raw_password if admin_access else None,
            'role': role.name if role else None,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def reset_pin(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/reset_pin/

        Resets the PIN (password) for a worker's portal account.
        
        Body (optional):
            pin  — 4-6 digit PIN; auto-generated if omitted

        Returns { employee_id, username, pin }
        """
        import random, string
        
        member = self.get_object()
        
        if not member.account:
            return Response(
                {'error': 'This member does not have a portal account yet.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        raw_pin = str(request.data.get('pin') or '').strip()
        if not raw_pin:
            raw_pin = ''.join(random.choices(string.digits, k=6))
        if not raw_pin.isdigit() or len(raw_pin) < 4 or len(raw_pin) > 6:
            return Response(
                {'error': 'PIN must be 4-6 digits.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
            
        member.set_portal_pin(raw_pin)
        member.save(update_fields=['portal_pin_hash', 'updated_at'])
        
        return Response({
            'message': f'PIN reset for {member.full_name}.',
            'employee_id': member.employee_id,
            'username': member.account.username,
            'pin': raw_pin,
        })

    @action(detail=True, methods=['post'])
    def send_credentials(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/send_credentials/

        Sends worker portal login credentials to an email address.
        The PIN must be supplied in the request body — it is never stored
        in plaintext, so it must be passed immediately after create_account.

        Body:
            recipient_email  — address to send to (required)
            pin              — plaintext PIN (required — only known at creation time)
            portal_url       — full URL of the worker portal (optional)
            project_name     — display name for the email header (optional)
        """
        from apps.core.email_utils import send_worker_portal_credentials

        member          = self.get_object()
        recipient_email = request.data.get('recipient_email', '').strip()
        pin             = request.data.get('pin', '').strip()
        password        = request.data.get('password', '').strip()
        admin_url       = request.data.get('admin_url', '')
        portal_url      = request.data.get('portal_url', '')
        project_name    = request.data.get('project_name', 'Construction Site')

        if not recipient_email:
            return Response({'error': 'recipient_email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not pin:
            return Response({'error': 'pin is required (PIN is only available immediately after account creation).'}, status=status.HTTP_400_BAD_REQUEST)

        username = (
            member.account.email
            if password and member.account
            else member.phone or (member.account.username if member.account else '')
        )

        ok = send_worker_portal_credentials(
            recipient_email = recipient_email,
            worker_name     = member.full_name,
            employee_id     = member.employee_id,
            username        = username,
            pin             = pin,
            password        = password,
            admin_url       = admin_url,
            project_name    = project_name,
            portal_url      = portal_url,
            user            = request.user,
        )

        if ok:
            return Response({'message': f'Credentials sent to {recipient_email}.'})
        else:
            return Response({'error': 'Email delivery failed. Check server email settings.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def seed_from_attendance(self, request):
        """
        POST /api/v1/workforce/members/seed_from_attendance/
        Body (optional): { "project": "<project_id>", "dry_run": false }

        Creates WorkforceMember records for every AttendanceWorker that is
        not yet linked to a WorkforceMember. Returns counts and a preview list.
        """
        from django.db import transaction
        from django.utils import timezone
        from apps.attendance.models import AttendanceWorker

        project_id = request.data.get('project') or request.query_params.get('project')
        dry_run    = bool(request.data.get('dry_run', False))

        # Workers not yet promoted to WorkforceMember
        qs = AttendanceWorker.objects.select_related('project', 'linked_user').filter(
            workforce_member__isnull=True,
        )
        if project_id:
            qs = qs.filter(project_id=project_id)

        workers = list(qs.order_by('name', 'id'))
        preview = []
        created = 0
        errors  = []

        def build_member_for_attendance_worker(aw):
            full_name = (aw.name or '').strip()
            if ' ' in full_name:
                parts      = full_name.rsplit(' ', 1)
                first_name = parts[0]
                last_name  = parts[1]
            else:
                first_name = full_name
                last_name  = ''

            wtype     = 'LABOUR' if aw.worker_type == 'LABOUR' else 'STAFF'
            join_date = aw.joined_date or timezone.now().date()
            phone     = aw.phone or ''
            email     = getattr(aw.linked_user, 'email', '') if aw.linked_user else ''

            entry = {
                'attendance_worker_id': aw.id,
                'name':    full_name,
                'trade':   aw.get_trade_display(),
                'project': str(aw.project_id),
                'worker_type': wtype,
            }
            member = WorkforceMember(
                attendance_worker=aw,
                account=aw.linked_user,
                worker_type=wtype,
                status='ACTIVE' if aw.is_active else 'INACTIVE',
                join_date=join_date,
                current_project=aw.project,
                created_by=request.user,
            )
            member.first_name = first_name
            member.last_name  = last_name
            member.phone      = phone
            member.email      = email
            return entry, member

        for aw in workers:
            entry, _ = build_member_for_attendance_worker(aw)
            preview.append(entry)

        if not dry_run and workers:
            try:
                with transaction.atomic():
                    locked_qs = AttendanceWorker.objects.select_for_update().select_related(
                        'project', 'linked_user',
                    ).filter(
                        workforce_member__isnull=True,
                        id__in=[aw.id for aw in workers],
                    ).order_by('name', 'id')

                    if project_id:
                        locked_qs = locked_qs.filter(project_id=project_id)

                    preview = []
                    for aw in locked_qs:
                        entry, member = build_member_for_attendance_worker(aw)
                        member.save()
                        created += 1
                        entry['workforce_member_id'] = str(member.id)
                        entry['employee_id']         = member.employee_id
                        preview.append(entry)
            except Exception as exc:
                errors.append({'worker': 'bulk_import', 'error': str(exc)})
                created = 0

        return Response({
            'status':         'preview' if dry_run else ('ok' if not errors else 'error'),
            'dry_run':        dry_run,
            'total_eligible': len(workers),
            'created':        created if not dry_run else 0,
            'would_create':   len(workers) if dry_run else None,
            'errors':         errors,
            'preview':        preview,
        }, status=status.HTTP_200_OK)
