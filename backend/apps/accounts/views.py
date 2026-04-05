from rest_framework import status, generics, permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import UserSerializer, LoginSerializer, RegisterSerializer, RoleSerializer, ActivityLogSerializer
from .models import Role, ActivityLog
from .permissions import IsSystemAdmin

User = get_user_model()


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def log_activity(request, user, action, model_name, object_id=None, object_repr='', description='', changes=None, success=True, error_message=''):
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
                error_message=error_message
            )
    except Exception as e:
        # Don't let logging break the main request
        print(f"Failed to log activity: {e}")


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    Login endpoint that returns JWT tokens.
    Accepts either 'email' or 'username' in the POST body.
    Since USERNAME_FIELD = 'email', we pass the email to authenticate().
    """
    serializer = LoginSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    password = serializer.validated_data['password']
    # Prefer email; fall back to username field (treated as email too)
    email = (
        serializer.validated_data.get('email')
        or serializer.validated_data.get('username')
    )

    # Django's authenticate() uses USERNAME_FIELD='email', so pass email=
    print(f"DEBUG: Login attempt for email: {email}")
    user = authenticate(request, email=email, password=password)

    # Fallback: if the custom backend wasn't used, try via User.objects
    if user is None:
        print(f"DEBUG: authenticate() returned None, trying User.objects fallback")
        try:
            candidate = User.objects.get(email=email)
            if candidate.check_password(password):
                if candidate.is_active:
                    user = candidate
                    print(f"DEBUG: Fallback successful for {email}")
                else:
                    print(f"DEBUG: User {email} is inactive")
            else:
                print(f"DEBUG: Incorrent password for {email}")
        except User.DoesNotExist:
            print(f"DEBUG: User {email} does not exist")

    if user is not None:
        try:
            user.update_frontend_last_login()
        except Exception:
            pass  # Column may not exist yet if migrations haven't run

        refresh = RefreshToken.for_user(user)
        user_serializer = UserSerializer(user)

        log_activity(
            request, user, 'LOGIN', 'User',
            object_id=user.id, object_repr=user.email, description='User logged in'
        )

        return Response({
            'user': user_serializer.data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_200_OK)
    else:
        return Response(
            {'error': 'Invalid credentials — check your email and password.'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """
    Logout endpoint that blacklists the refresh token
    """
    try:
        refresh_token = request.data.get('refresh')
        token = RefreshToken(refresh_token)
        token.blacklist()
        
        # Log logout
        log_activity(
            request, request.user, 'LOGOUT', 'User', 
            object_id=request.user.id, object_repr=request.user.email, description='User logged out'
        )
        
        return Response({
            'message': 'Logout successful',
            'action': 'redirect_to_login'
        }, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """
    Get or update current user profile
    """
    user = request.user
    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
    elif request.method == 'PATCH':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            log_activity(
                request, user, 'UPDATE', 'User', 
                object_id=user.id, object_repr=user.email, description='User updated their profile'
            )
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint
    """
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]

    def perform_create(self, serializer):
        user = serializer.save()
        log_activity(
            self.request, self.request.user, 'CREATE', 'User', 
            object_id=user.id, object_repr=user.email, description='Created a new user'
        )

    def perform_update(self, serializer):
        user = serializer.save()
        log_activity(
            self.request, self.request.user, 'UPDATE', 'User', 
            object_id=user.id, object_repr=user.email, description='Updated a user'
        )

    def perform_destroy(self, instance):
        log_activity(
            self.request, self.request.user, 'DELETE', 'User', 
            object_id=instance.id, object_repr=instance.email, description='Deleted a user'
        )
        instance.delete()


class RoleViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Roles are generally read-only from the API, managed via admin or migrations
    """
    queryset = Role.objects.all()
    serializer_class = RoleSerializer
    permission_classes = [permissions.IsAuthenticated, IsSystemAdmin]


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Activity logs are read-only and restricted to admins typically
    """
    queryset = ActivityLog.objects.all().select_related('user')
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'is_system_admin', False):
            return ActivityLog.objects.all().select_related('user')
        # Regular users only see their own logs
        return ActivityLog.objects.filter(user=user).select_related('user')

