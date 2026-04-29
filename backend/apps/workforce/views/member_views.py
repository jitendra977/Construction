from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import render
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.clickjacking import xframe_options_exempt
from ..models import WorkforceMember
from ..serializers import WorkforceMemberSerializer, WorkforceMemberListSerializer
from ..utils.badge_utils import generate_qr_base64


class WorkforceMemberViewSet(viewsets.ModelViewSet):
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
        project = request.query_params.get('project')
        qs = self.get_queryset()
        if project:
            qs = qs.filter(current_project=project)
        data = {
            'total':      qs.count(),
            'active':     qs.filter(status='ACTIVE').count(),
            'on_leave':   qs.filter(status='ON_LEAVE').count(),
            'inactive':   qs.filter(status__in=['INACTIVE', 'TERMINATED', 'SUSPENDED']).count(),
            'staff':      qs.filter(worker_type='STAFF').count(),
            'labour':     qs.filter(worker_type='LABOUR').count(),
            'linked':     qs.filter(attendance_worker__isnull=False).count(),
            'unlinked':   qs.filter(attendance_worker__isnull=True).count(),
        }
        return Response(data)

    @xframe_options_exempt
    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def badge(self, request, pk=None):
        """
        GET /api/v1/workforce/members/{id}/badge/
        Renders a printable ID card (badge) for the worker.
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
    def create_account(self, request, pk=None):
        """
        POST /api/v1/workforce/members/{id}/create_account/

        Creates a User account for a WorkforceMember so they can log in to
        the worker portal.  Uses phone number as username + a PIN.

        Body (all optional):
            phone  — overrides stored phone
            pin    — 4-6 digit PIN; auto-generated if omitted
            email  — optional email address

        Returns { employee_id, username, pin, email }
        PIN is returned ONCE only — manager must record it.
        """
        import random, string
        from django.contrib.auth import get_user_model

        User   = get_user_model()
        member = self.get_object()

        if member.account:
            return Response(
                {'error': 'This member already has an account.',
                 'username': member.account.username},
                status=status.HTTP_400_BAD_REQUEST,
            )

        phone = (request.data.get('phone') or member.phone or '').strip().replace(' ', '')
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

        email = request.data.get('email') or member.email or f'{phone}@worker.local'

        user = User.objects.create_user(
            username=phone,
            email=email,
            password=raw_pin,
            first_name=member.first_name,
            last_name=member.last_name,
            is_active=True,
        )
        if hasattr(user, 'phone_number'):
            user.phone_number = phone
            user.save(update_fields=['phone_number'])

        member.account = user
        member._phone  = phone
        member.save(update_fields=['account', '_phone', 'updated_at'])

        return Response({
            'message':     f'Account created for {member.full_name}.',
            'employee_id': member.employee_id,
            'username':    phone,
            'pin':         raw_pin,
            'email':       email,
        }, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'])
    def seed_from_attendance(self, request):
        """
        POST /api/v1/workforce/members/seed_from_attendance/
        Body (optional): { "project": "<project_id>", "dry_run": false }

        Creates WorkforceMember records for every AttendanceWorker that is
        not yet linked to a WorkforceMember. Returns counts and a preview list.
        """
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

        workers = list(qs)
        preview = []
        created = 0
        errors  = []

        for aw in workers:
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
            preview.append(entry)

            if not dry_run:
                try:
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
                    member.save()
                    created += 1
                    entry['workforce_member_id'] = str(member.id)
                    entry['employee_id']         = member.employee_id
                except Exception as exc:
                    errors.append({'worker': full_name, 'error': str(exc)})

        return Response({
            'dry_run':        dry_run,
            'total_eligible': len(workers),
            'created':        created if not dry_run else 0,
            'would_create':   len(workers) if dry_run else None,
            'errors':         errors,
            'preview':        preview,
        }, status=status.HTTP_200_OK)
