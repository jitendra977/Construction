import logging
import uuid

from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from django.utils import timezone
from django.db.models import Count, Q

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
def login_view(request):
    """JWT login — accepts email or username field."""
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    password = serializer.validated_data['password']
    email = (
        serializer.validated_data.get('email')
        or serializer.validated_data.get('username')
    )

    user = authenticate(request, email=email, password=password)

    if user is None:
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

        refresh = RefreshToken.for_user(user)
        log_activity(request, user, 'LOGIN', 'User',
                     object_id=user.id, object_repr=user.email,
                     description='User logged in')
        return Response({
            'user': UserSerializer(user).data,
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
def user_profile(request):
    """Current user profile — GET or PATCH."""
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
