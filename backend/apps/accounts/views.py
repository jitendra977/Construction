import logging
import uuid

from rest_framework import status, generics, permissions, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, throttle_classes, action, parser_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import BaseThrottle
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.db.models import Count, Q


class LoginRateThrottle(BaseThrottle):
    """
    Cache-independent throttle for the login endpoint.
    Uses a simple in-process dict so a Redis/cache failure can never
    take down the login page with a 500.  Limits each IP to 20 attempts
    per 15-minute window.
    """
    _attempts: dict = {}   # {ip: [timestamp, ...]}
    WINDOW_SECONDS = 15 * 60
    MAX_ATTEMPTS   = 20

    def allow_request(self, request, view):
        import time
        ip  = self.get_ident(request)
        now = time.time()

        # Purge expired timestamps
        self._attempts[ip] = [
            t for t in self._attempts.get(ip, [])
            if now - t < self.WINDOW_SECONDS
        ]

        if len(self._attempts[ip]) >= self.MAX_ATTEMPTS:
            self.wait_time = self.WINDOW_SECONDS - (now - self._attempts[ip][0])
            return False

        self._attempts[ip].append(now)
        return True

    def wait(self):
        return getattr(self, 'wait_time', None)

from .serializers import (
    UserSerializer, LoginSerializer, RegisterSerializer,
    RoleSerializer, ActivityLogSerializer,
)
from .models import Role, ActivityLog
from .permissions import IsSystemAdmin

logger = logging.getLogger(__name__)

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def log_activity(request, user, action, model_name,
                 object_id=None, object_repr='', description='',
                 changes=None, success=True, error_message=''):
    try:
        if user and user.is_authenticated:
            ActivityLog.objects.create(
                user=user,
                username=user.username,
                action=action,
                model_name=model_name,
                object_id=str(object_id) if object_id else None,
                object_repr=str(object_repr)[:200],
                description=description,
                changes=changes,
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:1000],
                endpoint=request.path,
                method=request.method,
                success=success,
                error_message=error_message,
            )
    except Exception as e:
        logger.warning("Failed to log activity: %s", e)


# ── Auth endpoints ────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])  # cache-independent throttle — Redis failure won't 500
def login_view(request):
    """JWT login — accepts email or username field."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    password = serializer.validated_data['password']
    email = (
        serializer.validated_data.get('email')
        or serializer.validated_data.get('username')
    )

    # Try both email and username keyword for backend compatibility
    user = authenticate(request, username=email, password=password)
    if user is None:
        # Fallback: direct lookup for email-based custom backends
        try:
            candidate = User.objects.get(email=email)
            if candidate.check_password(password):
                user = candidate if candidate.is_active else None
        except User.DoesNotExist:
            pass

    if user is not None:
        try:
            user.update_frontend_last_login()
        except Exception:
            pass

        try:
            refresh = RefreshToken.for_user(user)
        except Exception as e:
            logger.error("Failed to create JWT token for user %s: %s", user.email, e)
            return Response(
                {'error': 'Authentication succeeded but session could not be created. '
                          'Please contact support.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            user_data = UserSerializer(user).data
        except Exception as e:
            logger.error("UserSerializer failed for user %s: %s", user.email, e)
            # Return a minimal safe payload rather than a 500
            user_data = {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
            }

        log_activity(request, user, 'LOGIN', 'User',
                     object_id=user.id, object_repr=user.email,
                     description='User logged in')
        return Response({
            'user': user_data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

    return Response(
        {'error': 'Invalid credentials — check your email and password.'},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    try:
        token = RefreshToken(request.data.get('refresh'))
        token.blacklist()
        log_activity(request, request.user, 'LOGOUT', 'User',
                     object_id=request.user.id, object_repr=request.user.email,
                     description='User logged out')
        return Response({'message': 'Logout successful', 'action': 'redirect_to_login'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def user_profile(request):
    """Current user profile — GET or PATCH (supports multipart for profile_image)."""
    user = request.user
    if request.method == 'GET':
        return Response(UserSerializer(user).data)

    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        log_activity(request, user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description='User updated their profile')
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    """
    POST /api/v1/accounts/change-email/
    Body: { current_password, new_email }
    Requires password confirmation before changing the primary login email.
    """
    user         = request.user
    current_pw   = request.data.get('current_password', '').strip()
    new_email    = request.data.get('new_email', '').strip().lower()

    if not current_pw or not new_email:
        return Response({'error': 'current_password and new_email are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current_pw):
        return Response({'error': 'Current password is incorrect.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=new_email).exclude(pk=user.pk).exists():
        return Response({'error': 'An account with this email already exists.'},
                        status=status.HTTP_400_BAD_REQUEST)

    # Basic format validation
    import re
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', new_email):
        return Response({'error': 'Invalid email address.'}, status=status.HTTP_400_BAD_REQUEST)

    old_email  = user.email
    user.email = new_email
    user.save(update_fields=['email'])
    log_activity(request, user, 'UPDATE', 'User',
                 object_id=user.id, object_repr=user.email,
                 description=f'User changed email from {old_email} to {new_email}')
    return Response({'message': 'Email updated successfully.', 'email': new_email})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/v1/accounts/change-password/
    Body: { current_password, new_password }
    """
    user = request.user
    current = request.data.get('current_password', '')
    new_pw  = request.data.get('new_password', '')

    if not current or not new_pw:
        return Response({'error': 'current_password and new_password are required.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if not user.check_password(current):
        return Response({'error': 'Current password is incorrect.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if len(new_pw) < 8:
        return Response({'error': 'New password must be at least 8 characters.'},
                        status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_pw)
    user.save(update_fields=['password'])
    log_activity(request, user, 'UPDATE', 'User',
                 object_id=user.id, object_repr=user.email,
                 description='User changed their password')
    return Response({'message': 'Password changed successfully.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def accounts_stats(request):
    """
    GET /api/v1/accounts/stats/
    Returns summary stats for the accounts dashboard.
    """
    total_users   = User.objects.count()
    active_users  = User.objects.filter(is_active=True).count()
    inactive_users = total_users - active_users
    total_roles   = Role.objects.count()
    today         = timezone.now().date()
    new_today     = User.objects.filter(date_joined__date=today).count()

    # Activity summary (last 30 days)
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(days=30)
    activity_30d = ActivityLog.objects.filter(timestamp__gte=cutoff).count()
    logins_30d   = ActivityLog.objects.filter(
        timestamp__gte=cutoff, action='LOGIN').count()

    # Users by role
    role_breakdown = list(
        User.objects.values('role__name', 'role__code')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Recent registrations (last 7 days)
    week_ago = timezone.now() - timedelta(days=7)
    recent_users = UserSerializer(
        User.objects.filter(date_joined__gte=week_ago).order_by('-date_joined')[:5],
        many=True,
    ).data

    return Response({
        'total_users':    total_users,
        'active_users':   active_users,
        'inactive_users': inactive_users,
        'total_roles':    total_roles,
        'new_today':      new_today,
        'activity_30d':   activity_30d,
        'logins_30d':     logins_30d,
        'role_breakdown': role_breakdown,
        'recent_users':   recent_users,
    })


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


# ── User ViewSet ──────────────────────────────────────────────────────────────

class UserViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for users + extra actions:
      POST   /users/{id}/activate/
      POST   /users/{id}/deactivate/
      POST   /users/{id}/reset_password/
      POST   /users/invite/
    """
    queryset = User.objects.select_related('role').all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]
    parser_classes    = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        # Allow any authenticated user to retrieve their own record
        if self.action in ('retrieve',):
            return [IsAuthenticated()]
        return super().get_permissions()

    def perform_create(self, serializer):
        user = serializer.save()
        log_activity(self.request, self.request.user, 'CREATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Created user {user.email}')

    def perform_update(self, serializer):
        user = serializer.save()
        log_activity(self.request, self.request.user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Updated user {user.email}')

    def perform_destroy(self, instance):
        log_activity(self.request, self.request.user, 'DELETE', 'User',
                     object_id=instance.id, object_repr=instance.email,
                     description=f'Deleted user {instance.email}')
        instance.delete()

    @action(detail=True, methods=['post'], url_path='activate')
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save(update_fields=['is_active'])
        log_activity(request, request.user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Activated user {user.email}')
        return Response({'message': f'{user.email} activated.', 'is_active': True})

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({'error': 'You cannot deactivate your own account.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.is_active = False
        user.save(update_fields=['is_active'])
        log_activity(request, request.user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Deactivated user {user.email}')
        return Response({'message': f'{user.email} deactivated.', 'is_active': False})

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Admin sets a new password for a user."""
        user = self.get_object()
        new_pw = request.data.get('new_password', '')
        if len(new_pw) < 8:
            return Response({'error': 'Password must be at least 8 characters.'},
                            status=status.HTTP_400_BAD_REQUEST)
        user.set_password(new_pw)
        user.save(update_fields=['password'])
        log_activity(request, request.user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Admin reset password for {user.email}')
        return Response({'message': f'Password reset for {user.email}.'})

    @action(detail=True, methods=['get'], url_path='projects')
    def user_projects(self, request, pk=None):
        """
        GET /api/v1/accounts/users/{id}/projects/
        Returns every project in the system with this user's membership status.
        """
        from apps.core.models import HouseProject, ProjectMember
        user = self.get_object()

        all_projects = HouseProject.objects.all().order_by('name')
        memberships  = {
            m.project_id: m
            for m in ProjectMember.objects.filter(user=user).select_related('project')
        }
        assigned_ids = set(user.assigned_projects.values_list('id', flat=True))

        data = []
        for p in all_projects:
            m = memberships.get(p.id)
            data.append({
                'project_id':   p.id,
                'project_name': p.name,
                'is_assigned':  p.id in assigned_ids,
                'member_id':    m.id   if m else None,
                'member_role':  m.role if m else None,
                'permissions': {
                    'can_manage_members':   m.can_manage_members   if m else False,
                    'can_manage_finances':  m.can_manage_finances  if m else False,
                    'can_view_finances':    m.can_view_finances    if m else False,
                    'can_manage_phases':    m.can_manage_phases    if m else False,
                    'can_manage_structure': m.can_manage_structure if m else False,
                    'can_manage_resources': m.can_manage_resources if m else False,
                    'can_upload_media':     m.can_upload_media     if m else False,
                } if m else None,
            })
        return Response(data)

    @action(detail=True, methods=['post'], url_path='set-project')
    def set_project(self, request, pk=None):
        """
        POST /api/v1/accounts/users/{id}/set-project/
        Body: { project_id, action: 'add'|'remove', role, ...permission flags }
        Adds/removes project access and manages the ProjectMember record.
        """
        from apps.core.models import HouseProject, ProjectMember
        user       = self.get_object()
        project_id = request.data.get('project_id')
        op         = request.data.get('action', 'add')

        try:
            project = HouseProject.objects.get(id=project_id)
        except HouseProject.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=404)

        if op == 'remove':
            user.assigned_projects.remove(project)
            ProjectMember.objects.filter(user=user, project=project).delete()
            log_activity(request, request.user, 'UPDATE', 'User',
                         object_id=user.id, object_repr=user.email,
                         description=f'Removed {user.email} from project {project.name}')
            return Response({'message': f'Removed {user.email} from {project.name}.'})

        # ── add / update ──────────────────────────────────────────────────────
        role = request.data.get('role', 'VIEWER')
        user.assigned_projects.add(project)

        member, created = ProjectMember.objects.get_or_create(
            user=user, project=project,
            defaults={'role': role},
        )
        if not created:
            member.role = role

        # Seed defaults from role, then override with any explicit flags sent
        member.apply_role_defaults()
        perm_fields = [
            'can_manage_members', 'can_manage_finances', 'can_view_finances',
            'can_manage_phases',  'can_manage_structure',
            'can_manage_resources', 'can_upload_media',
        ]
        for field in perm_fields:
            if field in request.data:
                setattr(member, field, bool(request.data[field]))
        member.save()

        log_activity(request, request.user, 'UPDATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'{"Added" if created else "Updated"} {user.email} in {project.name} as {role}')
        return Response({
            'message':   f'{"Added" if created else "Updated"} {user.email} in {project.name} as {role}.',
            'member_id': member.id,
            'created':   created,
        })

    @action(detail=False, methods=['post'], url_path='invite')
    def invite(self, request):
        """
        Create a new user account directly (invite flow).
        Body: { email, username, first_name, last_name, role_id, password }
        """
        email    = request.data.get('email', '').strip().lower()
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        role_id  = request.data.get('role_id')

        if not email:
            return Response({'error': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists.'},
                            status=status.HTTP_400_BAD_REQUEST)

        # Auto-generate username from email if not provided
        if not username:
            username = email.split('@')[0]
            base = username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f'{base}{counter}'
                counter += 1

        if not password:
            password = uuid.uuid4().hex[:12]  # random temp password

        role = None
        if role_id:
            try:
                role = Role.objects.get(id=role_id)
            except Role.DoesNotExist:
                pass

        user = User.objects.create_user(
            email=email,
            username=username,
            password=password,
            first_name=request.data.get('first_name', ''),
            last_name=request.data.get('last_name', ''),
            role=role,
            is_active=True,
        )
        log_activity(request, request.user, 'CREATE', 'User',
                     object_id=user.id, object_repr=user.email,
                     description=f'Invited / created user {user.email}')
        return Response({
            'message': f'User {user.email} created successfully.',
            'user': UserSerializer(user).data,
            'temp_password': password,
        }, status=status.HTTP_201_CREATED)


# ── Role ViewSet ──────────────────────────────────────────────────────────────

class RoleViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for roles (previously read-only).
    System roles (SUPER_ADMIN etc.) can be updated but not deleted.
    """
    queryset = Role.objects.annotate(user_count=Count('users')).all()
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated, IsSystemAdmin]

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        system_codes = {c for c, _ in Role.ROLE_CODES}
        if role.code in system_codes:
            return Response(
                {'error': 'System roles cannot be deleted. You can edit their permissions.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


# ── Activity Log ViewSet ──────────────────────────────────────────────────────

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.select_related('user').all()
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ActivityLog.objects.select_related('user').all()
        if not getattr(user, 'is_system_admin', False):
            qs = qs.filter(user=user)

        # Optional filters via query params
        action_filter = self.request.query_params.get('action')
        model_filter  = self.request.query_params.get('model')
        user_filter   = self.request.query_params.get('user_id')
        days          = self.request.query_params.get('days')

        if action_filter and action_filter != 'ALL':
            qs = qs.filter(action=action_filter)
        if model_filter and model_filter != 'ALL':
            qs = qs.filter(model_name__icontains=model_filter)
        if user_filter:
            qs = qs.filter(user_id=user_filter)
        if days:
            from datetime import timedelta
            qs = qs.filter(timestamp__gte=timezone.now() - timedelta(days=int(days)))

        return qs.order_by('-timestamp')


# ══════════════════════════════════════════════════════════════════════════════
#  WORKER PORTAL — lightweight endpoints for staff/supervisors on mobile
# ══════════════════════════════════════════════════════════════════════════════

class WorkerLoginView(APIView):
    """
    POST /api/v1/worker/login/
    Body: { "phone": "98XXXXXXXX", "pin": "123456" }

    Authenticates via phone (username) + PIN (password) and returns
    a JWT pair identical to the main login — same tokens, different UI.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from rest_framework_simplejwt.tokens import RefreshToken
        from django.contrib.auth import authenticate, get_user_model
        import re

        User = get_user_model()
        phone = (request.data.get('phone') or '').strip()
        phone = re.sub(r'[^\d\+]', '', phone)
        pin   = (request.data.get('pin')   or '').strip()

        if not phone or not pin:
            return Response(
                {'error': 'phone and pin are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_email = User.objects.get(username=phone).email
            user = authenticate(request, username=target_email, password=pin)
        except User.DoesNotExist:
            user = None

        if not user:
            return Response(
                {'error': 'Invalid phone number or PIN.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not hasattr(user, 'workforce_profile'):
            return Response(
                {'error': 'This account is not linked to a workforce profile.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        member  = user.workforce_profile

        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'worker': {
                'employee_id': member.employee_id,
                'full_name':   member.full_name,
                'role':        member.role.title if member.role else member.worker_type,
                'project_id':  str(member.current_project_id) if member.current_project_id else None,
            }
        })


class WorkerMeView(APIView):
    """
    GET /api/v1/worker/me/
    Returns the authenticated worker's own profile + today's attendance.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone

        user = request.user
        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'No workforce profile linked.'}, status=404)

        member = user.workforce_profile
        today  = timezone.localdate()

        # Parse ?month=YYYY-MM or default to current month
        month_str = request.query_params.get('month')
        if month_str:
            try:
                import datetime
                target_year, target_month = map(int, month_str.split('-'))
            except Exception:
                target_year, target_month = today.year, today.month
        else:
            target_year, target_month = today.year, today.month

        # Today's attendance via the linked AttendanceWorker
        today_att = None
        if member.attendance_worker:
            from apps.attendance.models import DailyAttendance
            att = DailyAttendance.objects.filter(
                worker=member.attendance_worker, date=today
            ).first()
            if att:
                today_att = {
                    'status':     att.status,
                    'check_in':   str(att.check_in)  if att.check_in  else None,
                    'check_out':  str(att.check_out) if att.check_out else None,
                    'daily_rate': str(att.daily_rate_snapshot),
                }

        # Monthly attendance summary and payroll
        from apps.attendance.models import DailyAttendance
        from datetime import timedelta
        import calendar
        month_att = []
        payroll = {'total_days': 0, 'total_wage': 0.0, 'total_ot': 0.0}

        if member.attendance_worker:
            # Get first and last day of the target month
            _, last_day = calendar.monthrange(target_year, target_month)
            start_date = timezone.datetime(target_year, target_month, 1).date()
            end_date   = timezone.datetime(target_year, target_month, last_day).date()

            records = DailyAttendance.objects.filter(
                worker=member.attendance_worker,
                date__gte=start_date,
                date__lte=end_date,
            ).order_by('-date').prefetch_related('scan_logs')

            for r in records:
                # Determine scan method from logs
                logs_data = []
                scan_method = 'Manual'
                for log in r.scan_logs.all():
                    if log.scan_status == 'VALID':
                        scan_method = 'QR Scan'
                    logs_data.append({
                        'time': log.scanned_at.strftime('%H:%M'),
                        'type': log.get_scan_type_display(),
                        'status': log.scan_status,
                        'is_late': log.is_late,
                        'is_early': log.is_early,
                        'note': log.note,
                    })

                month_att.append({
                    'date': str(r.date), 'status': r.status,
                    'check_in': str(r.check_in) if r.check_in else None,
                    'check_out': str(r.check_out) if r.check_out else None,
                    'wage': float(r.wage_earned),
                    'ot': float(r.overtime_hours),
                    'daily_rate': float(r.daily_rate_snapshot),
                    'scan_method': scan_method,
                    'logs': logs_data,
                    'is_late': r.scan_logs.filter(scan_type='CHECK_IN', is_late=True).exists(),
                    'is_early': r.scan_logs.filter(scan_type='CHECK_OUT', is_early=True).exists(),
                })
                payroll['total_days'] += 1 if r.status in ['PRESENT', 'HALF_DAY'] else 0
                payroll['total_wage'] += float(r.wage_earned)
                payroll['total_ot']   += float(r.overtime_hours)

        # Teams they belong to
        teams = list(
            member.teams.values('id', 'name', 'project__name')
        )

        return Response({
            'employee_id':   member.employee_id,
            'full_name':     member.full_name,
            'phone':         member.phone,
            'worker_type':   member.worker_type,
            'status':        member.status,
            'role':          member.role.title if member.role else None,
            'project':       member.current_project.name if member.current_project else None,
            'join_date':     str(member.join_date),
            'today':         today_att,
            'history':       month_att,
            'payroll':       payroll,
            'target_month':  f"{target_year}-{target_month:02d}",
            'teams':         teams,
        })


class WorkerQRView(APIView):
    """
    GET /api/v1/worker/qr/
    Returns the worker's QR badge image as a base64 string.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        import io, base64, json, logging
        logger = logging.getLogger(__name__)

        user = request.user
        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'No workforce profile linked.'}, status=404)

        member = user.workforce_profile
        if not member.attendance_worker:
            return Response({'error': 'No attendance worker linked to this profile.'}, status=404)

        worker = member.attendance_worker

        payload_str = json.dumps({
            'type': 'hcms_attendance',
            'worker_id': worker.id,
            'project_id': worker.project_id,
            'token': str(worker.qr_token),
        }, separators=(',', ':'))

        try:
            import qrcode
            qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=10, border=4)
            qr.add_data(payload_str)
            qr.make(fit=True)
            img = qr.make_image(fill_color='#1a1a2e', back_color='white')
            buf = io.BytesIO()
            img.save(buf, format='PNG')
            b64 = base64.b64encode(buf.getvalue()).decode()
            data_url = f'data:image/png;base64,{b64}'
        except Exception as e:
            logger.error('QR gen failed for worker %s: %s', worker.id, e)
            return Response({'error': 'QR generation failed. Is qrcode installed?'}, status=500)

        return Response({
            'qr_image':   data_url,
            'qr_payload': payload_str,
            'qr_token':   str(worker.qr_token),
        })


class WorkerQRLoginView(APIView):
    """
    POST /api/v1/worker/qr-login/
    Body: { "qr_data": "<JSON string encoded inside QR code>" }

    Decodes the QR payload, validates the worker's token, and returns JWT
    tokens so the worker is logged in without typing a phone/PIN.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        import json
        from apps.attendance.models import AttendanceWorker
        from rest_framework_simplejwt.tokens import RefreshToken

        raw = (request.data.get('qr_data') or '').strip()
        if not raw:
            return Response({'error': 'No QR data received.'}, status=400)

        # 1. Parse JSON
        try:
            payload = json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return Response({'error': 'Invalid QR code format. Not a valid HCMS badge.'}, status=400)

        # 2. Check Type
        if payload.get('type') != 'hcms_attendance':
            return Response({'error': 'This QR code is for a different system. Use your HCMS Worker Badge.'}, status=400)

        # 3. Find Worker
        try:
            worker = AttendanceWorker.objects.select_related(
                'project', 'linked_user', 'project_member__user'
            ).get(
                pk=payload.get('worker_id'),
                qr_token=payload.get('token'),
                is_active=True,
            )
        except AttendanceWorker.DoesNotExist:
            return Response({'error': 'Invalid, revoked, or expired QR Badge.'}, status=404)
        except Exception as e:
            return Response({'error': f'Auth failed: {str(e)}'}, status=500)

        # 4. Resolve User Account
        # Priority: linked_user > project_member.user
        user = worker.linked_user
        if not user and worker.project_member:
            user = worker.project_member.user
        
        if not user:
            return Response({
                'error': 'This badge is valid for attendance, but you do not have a portal account yet. Please contact your site manager to "Create Portal Account".'
            }, status=403)

        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'Your account is not fully configured as a workforce profile.'}, status=403)

        # 5. Success -> Issue JWT
        member = user.workforce_profile
        refresh = RefreshToken.for_user(user)

        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'worker': {
                'employee_id': member.employee_id,
                'full_name':   member.full_name,
                'role':        member.role.title if member.role else member.worker_type,
                'project_id':  str(member.current_project_id) if member.current_project_id else None,
            }
        })


class WorkerCheckinView(APIView):
    """
    POST /api/v1/worker/checkin/
    Body: { "type": "CHECK_IN" | "CHECK_OUT" }

    Triggers a check-in or check-out for the authenticated worker using
    their linked QR token + the project's ScanTimeWindow validation.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from django.utils import timezone as tz
        import datetime as dt

        user = request.user
        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'No workforce profile linked.'}, status=404)

        member = user.workforce_profile
        if not member.attendance_worker:
            return Response(
                {'error': 'No attendance record linked to your profile. Contact your supervisor.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        scan_type = (request.data.get('type') or 'CHECK_IN').upper()
        if scan_type not in ('CHECK_IN', 'CHECK_OUT'):
            return Response({'error': 'type must be CHECK_IN or CHECK_OUT.'}, status=400)

        aw      = member.attendance_worker
        project = aw.project
        now     = tz.now()
        today   = tz.localdate()

        # Validate against ScanTimeWindow
        from apps.attendance.models import ScanTimeWindow, DailyAttendance, QRScanLog
        window = ScanTimeWindow.objects.filter(project=project, is_active=True).first()
        current_time = now.time().replace(second=0, microsecond=0)

        if window:
            if scan_type == 'CHECK_IN':
                if not (window.checkin_start <= current_time <= window.checkin_end):
                    return Response({
                        'error': f'Check-in window is {window.checkin_start} – {window.checkin_end}. Current time: {current_time}.'
                    }, status=status.HTTP_400_BAD_REQUEST)
            else:
                if not (window.checkout_start <= current_time <= window.checkout_end):
                    return Response({
                        'error': f'Check-out window is {window.checkout_start} – {window.checkout_end}. Current time: {current_time}.'
                    }, status=status.HTTP_400_BAD_REQUEST)

        # Get or create today's DailyAttendance
        att, _ = DailyAttendance.objects.get_or_create(
            worker=aw, date=today,
            defaults={
                'project':              project,
                'status':               'PRESENT',
                'daily_rate_snapshot':  aw.daily_rate,
                'overtime_rate_snapshot': aw.effective_overtime_rate() if hasattr(aw, 'effective_overtime_rate') else 0,
            },
        )

        # Apply check-in / check-out time
        is_late = is_early = False
        if scan_type == 'CHECK_IN':
            if att.check_in:
                return Response({'error': 'Already checked in today.'}, status=400)
            att.check_in = now.time()
            if window:
                late_threshold = (
                    dt.datetime.combine(today, window.checkin_start)
                    + dt.timedelta(minutes=window.late_threshold_minutes or 30)
                ).time()
                is_late = att.check_in > late_threshold
            att.save(update_fields=['check_in', 'status'])
        else:
            if not att.check_in:
                return Response({'error': 'Must check in before checking out.'}, status=400)
            if att.check_out:
                return Response({'error': 'Already checked out today.'}, status=400)
            att.check_out = now.time()
            if window:
                is_early = att.check_out < window.checkout_start
            att.save(update_fields=['check_out'])

        # Log the scan
        QRScanLog.objects.create(
            worker=aw,
            attendance=att,
            scan_type=scan_type,
            scan_status='VALID',
            scanned_at=now,
            scanned_by=user,
            is_late=is_late,
            is_early=is_early,
            note='Manual check-in via portal',
        )

        return Response({
            'status':    'ok',
            'scan_type': scan_type,
            'time':      now.strftime('%H:%M'),
            'is_late':   is_late,
            'is_early':  is_early,
            'message':   f'{"Check-in" if scan_type == "CHECK_IN" else "Check-out"} recorded at {now.strftime("%H:%M")}.',
        })


class WorkerQRCheckinView(APIView):
    """
    POST /api/v1/worker/qr-checkin/
    Body: { "qr_data": "<JSON string scanned from QR code>" }

    Secure self-check-in via QR. The worker scans their OWN QR badge.
    - Validates QR belongs to the authenticated user's attendance worker.
    - Rejects any QR code that belongs to a different worker.
    - Performs CHECK_IN or CHECK_OUT based on today's attendance state.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.attendance.models import AttendanceWorker, DailyAttendance, ScanTimeWindow, QRScanLog
        from django.utils import timezone as tz
        import datetime as dt

        user = request.user
        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'No workforce profile found.'}, status=404)
        
        member = user.workforce_profile
        my_worker = getattr(member, 'attendance_worker', None)
        if not my_worker:
            return Response({'error': 'No attendance profile linked to your account.'}, status=404)

        payload_str = request.data.get('qr_data')
        if not payload_str:
            return Response({'error': 'No QR data provided.'}, status=400)

        # 1. Parse and validate QR payload
        try:
            import json
            payload = json.loads(payload_str)
        except:
            return Response({'error': 'Invalid QR data format.'}, status=400)

        if payload.get('type') != 'hcms_attendance':
            return Response({'error': 'Not a valid attendance QR code.'}, status=400)

        # 2. Security Check: Must be YOUR QR badge
        scanned_worker_id = payload.get('worker_id')
        scanned_token     = payload.get('token')

        if str(scanned_worker_id) != str(my_worker.id) or str(scanned_token) != str(my_worker.qr_token):
            return Response({
                'error': 'This QR code does not belong to your account.',
            }, status=status.HTTP_403_FORBIDDEN)

        # 3. Perform check-in / check-out
        project      = my_worker.project
        now          = tz.now()
        today        = tz.localdate()
        current_time = now.time().replace(second=0, microsecond=0)

        # Determine scan type
        att_today = DailyAttendance.objects.filter(worker=my_worker, date=today).first()
        if att_today and att_today.check_in and att_today.check_out:
            return Response({'error': 'You have already checked in and out today.'}, status=400)
        
        scan_type = 'CHECK_OUT' if (att_today and att_today.check_in) else 'CHECK_IN'

        # ── Enforce Cooling Periods ───────────────────────────────────────────
        last_log = QRScanLog.objects.filter(worker=my_worker, scanned_at__date=today).order_by('-scanned_at').first()
        if last_log:
            diff_seconds = (now - last_log.scanned_at).total_seconds()
            
            # 1. Generic 1-minute anti-spam
            if diff_seconds < 60:
                return Response({
                    'error': f'Slow down! Please wait {int(60 - diff_seconds)}s before scanning again.'
                }, status=400)
            
            # 2. 5-minute gap between IN and OUT
            if scan_type == 'CHECK_OUT' and last_log.scan_type == 'CHECK_IN':
                if diff_seconds < 300:
                    return Response({
                        'error': f'Check-out is only allowed 5 minutes after check-in. Please wait {int((300 - diff_seconds)/60)}m {int((300 - diff_seconds)%60)}s.'
                    }, status=400)
        # ──────────────────────────────────────────────────────────────────────

        # Check time window
        window = ScanTimeWindow.objects.filter(project=project, is_active=True).first()
        is_late = is_early = False
        if window:
            if scan_type == 'CHECK_IN':
                if not (window.checkin_start <= current_time <= window.checkin_end):
                    return Response({
                        'error': f'Check-in window is {window.checkin_start.strftime("%H:%M")} – {window.checkin_end.strftime("%H:%M")}.'
                    }, status=400)
                
                late_threshold = (dt.datetime.combine(today, window.checkin_start) + dt.timedelta(minutes=window.late_threshold_minutes or 30)).time()
                is_late = current_time > late_threshold
            else:
                if not (window.checkout_start <= current_time <= window.checkout_end):
                    return Response({
                        'error': f'Check-out window is {window.checkout_start.strftime("%H:%M")} – {window.checkout_end.strftime("%H:%M")}.'
                    }, status=400)
                is_early = current_time < window.checkout_start

        # Create or update today's attendance
        att, created = DailyAttendance.objects.get_or_create(
            worker=my_worker, date=today,
            defaults={
                'project': project,
                'status':  'PRESENT',
                'daily_rate_snapshot': my_worker.daily_rate,
                'overtime_rate_snapshot': my_worker.effective_overtime_rate(),
            },
        )

        if scan_type == 'CHECK_IN':
            if att.check_in:
                return Response({'error': 'Already checked in today.'}, status=400)
            att.check_in = now.time()
            att.save(update_fields=['check_in', 'status'])
        else:
            if att.check_out:
                return Response({'error': 'Already checked out today.'}, status=400)
            att.check_out = now.time()
            att.save(update_fields=['check_out'])

        # Log the QR scan
        QRScanLog.objects.create(
            worker=my_worker,
            attendance=att,
            scan_type=scan_type,
            scan_status='VALID',
            scanned_at=now,
            scanned_by=user,
            is_late=is_late,
            is_early=is_early,
            note='Self-scan via worker portal',
        )

        return Response({
            'status':    'ok',
            'scan_type': scan_type,
            'time':      now.strftime('%H:%M'),
            'is_late':   is_late,
            'is_early':  is_early,
            'message':   f'{"✅ Checked in" if scan_type == "CHECK_IN" else "👋 Checked out"} at {now.strftime("%H:%M")}.',
        })


class WorkerMyTeamView(APIView):
    """
    GET /api/v1/worker/my-team/
    For supervisors/team leaders — returns today's attendance status
    for every member of their assigned team.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.utils import timezone
        from apps.attendance.models import DailyAttendance

        user = request.user
        if not hasattr(user, 'workforce_profile'):
            return Response({'error': 'No workforce profile linked.'}, status=404)

        member = user.workforce_profile
        today  = timezone.localdate()

        # Teams this member leads
        led_teams = member.led_teams.prefetch_related('members__attendance_worker').all()
        if not led_teams.exists():
            return Response({'error': 'You are not assigned as leader of any team.'}, status=404)

        result = []
        for team in led_teams:
            members_data = []
            for m in team.members.select_related('attendance_worker').all():
                att = None
                if m.attendance_worker:
                    rec = DailyAttendance.objects.filter(
                        worker=m.attendance_worker, date=today
                    ).first()
                    if rec:
                        att = {
                            'status':    rec.status,
                            'check_in':  str(rec.check_in)  if rec.check_in  else None,
                            'check_out': str(rec.check_out) if rec.check_out else None,
                        }
                members_data.append({
                    'employee_id': m.employee_id,
                    'full_name':   m.full_name,
                    'role':        m.role.title if m.role else m.worker_type,
                    'today':       att or {'status': 'NOT_MARKED'},
                })
            result.append({
                'team_id':   team.id,
                'team_name': team.name,
                'members':   members_data,
            })

        return Response(result)
