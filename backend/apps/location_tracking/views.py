from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import viewsets, views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action

from .models import ProjectGeofence, StaffLocationLog, StaffPresenceSession, ProjectSitePin
from .serializers import (
    ProjectGeofenceSerializer,
    StaffLocationLogSerializer,
    StaffPresenceSessionSerializer,
    ProjectSitePinSerializer,
)
from .utils import haversine_distance, is_point_in_geofence


def _user_avatar_url(request, user):
    """Absolute URL for the user's profile photo, or None if not set."""
    if not user or not user.profile_image:
        return None
    try:
        url = user.profile_image.url
        if request:
            return request.build_absolute_uri(url)
        return url
    except (ValueError, AttributeError):
        return None


def _allowed_project_ids_for_user(user):
    """
    Scope location tracking to the projects the current user actually belongs to.
    This prevents pings and live views from leaking across unrelated projects.
    """
    if not user or not user.is_authenticated:
        return set()

    project_ids = set()

    if getattr(user, 'active_project_id', None):
        project_ids.add(user.active_project_id)

    try:
        project_ids.update(user.assigned_projects.values_list('id', flat=True))
    except Exception:
        pass

    try:
        project_ids.update(user.project_memberships.values_list('project_id', flat=True))
    except Exception:
        pass

    try:
        member = getattr(user, 'workforce_profile', None)
        if member and member.current_project_id:
            project_ids.add(member.current_project_id)
    except Exception:
        pass

    return {pid for pid in project_ids if pid}


class GeofenceViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Project Geofences.
    Supports multiple zones per project (main gate, storage yard, etc.)
    """
    queryset = ProjectGeofence.objects.all()
    serializer_class = ProjectGeofenceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        return qs


class LocationPingView(views.APIView):
    """
    Receives periodic GPS pings from staff mobile devices.
    - Accuracy filter (>50m rejected)
    - Matches against all active geofences via haversine
    - Calculates speed from previous ping
    - Logs raw ping with geofence match
    - Creates/updates presence sessions with last known position
    - 10-minute grace period before closing a session
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        accuracy = request.data.get('accuracy', 0)
        heading = request.data.get('heading', None)

        if lat is None or lon is None:
            return Response(
                {"error": "Latitude and longitude are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            lat = float(lat)
            lon = float(lon)
            accuracy = float(accuracy)
        except (ValueError, TypeError):
            return Response(
                {"error": "Invalid coordinates format."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 1. Accuracy Filter
        if accuracy > 50:
            return Response(
                {"status": "ignored", "message": f"Accuracy too low ({accuracy}m). Ping ignored."},
                status=status.HTTP_200_OK,
            )

        # 2. Calculate speed from previous ping
        speed = None
        try:
            prev_log = (
                StaffLocationLog.objects
                .filter(user=user)
                .order_by('-timestamp')
                .first()
            )
            if prev_log:
                time_delta = (timezone.now() - prev_log.timestamp).total_seconds()
                if time_delta > 0:
                    dist = haversine_distance(
                        lat, lon,
                        float(prev_log.latitude), float(prev_log.longitude),
                    )
                    speed = dist / time_delta  # m/s
        except Exception:
            pass

        # 3. Find if ping is inside any active geofence
        allowed_project_ids = _allowed_project_ids_for_user(user)
        active_geofences = ProjectGeofence.objects.filter(is_active=True).select_related('project')
        if allowed_project_ids:
            active_geofences = active_geofences.filter(project_id__in=allowed_project_ids)
        matched_project = None
        matched_geofence = None

        for fence in active_geofences:
            if is_point_in_geofence(
                lat, lon,
                float(fence.latitude), float(fence.longitude),
                fence.radius_meters,
            ):
                matched_project = fence.project
                matched_geofence = fence
                break

        # 4. Log the raw ping
        log = StaffLocationLog.objects.create(
            user=user,
            latitude=lat,
            longitude=lon,
            accuracy=accuracy,
            speed=speed,
            heading=heading,
            is_on_site=(matched_project is not None),
            project=matched_project,
            geofence=matched_geofence,
        )

        now = timezone.now()

        # 5. Handle Presence Sessions
        if matched_project:
            session, created = StaffPresenceSession.objects.get_or_create(
                user=user,
                project=matched_project,
                is_active=True,
                defaults={
                    'entry_at': now,
                    'exit_at': now,
                    'last_known_lat': lat,
                    'last_known_lon': lon,
                    'last_ping_at': now,
                },
            )

            if not created:
                session.exit_at = now
                session.last_known_lat = lat
                session.last_known_lon = lon
                session.last_ping_at = now
                duration = session.exit_at - session.entry_at
                session.duration_minutes = int(duration.total_seconds() / 60)
                session.save()

            # Close sessions for OTHER projects
            StaffPresenceSession.objects.filter(
                user=user,
                is_active=True,
            ).exclude(project=matched_project).update(is_active=False)

            status_msg = "on_site"
        else:
            # Outside all geofences — apply 10-minute grace period
            active_sessions = StaffPresenceSession.objects.filter(user=user, is_active=True)
            status_msg = "off_site"

            for session in active_sessions:
                if session.last_ping_at and (now - session.last_ping_at) > timedelta(minutes=10):
                    session.is_active = False
                    session.save()
                    status_msg = "exited_site"
                elif session.exit_at and (now - session.exit_at) > timedelta(minutes=10):
                    session.is_active = False
                    session.save()
                    status_msg = "exited_site"

        return Response(
            {
                "status": status_msg,
                "project_id": matched_project.id if matched_project else None,
                "geofence_id": matched_geofence.id if matched_geofence else None,
                "geofence_name": matched_geofence.name if matched_geofence else None,
                "speed_ms": round(speed, 2) if speed is not None else None,
                "log_id": log.id,
            },
            status=status.HTTP_201_CREATED,
        )


class LivePositionsView(views.APIView):
    """
    Returns the current GPS position and status of all active staff
    for a given project. Used by the live map to render worker markers.

    GET /api/v1/location/live/?project=<id>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        project_id = request.query_params.get('project')
        if not project_id:
            return Response({"error": "project query param required."}, status=400)

        allowed_user_ids = set()
        User = get_user_model()
        project_users = User.objects.filter(
            Q(active_project_id=project_id) |
            Q(assigned_projects__id=project_id) |
            Q(project_memberships__project_id=project_id) |
            Q(workforce_profile__current_project_id=project_id)
        ).distinct()
        allowed_user_ids.update(project_users.values_list('id', flat=True))

        # 1. Fetch the absolute latest GPS logs for users related to this project in the last 12 hours
        time_limit = timezone.now() - timedelta(hours=12)
        recent_logs = (
            StaffLocationLog.objects
            .filter(timestamp__gte=time_limit, user_id__in=allowed_user_ids)
            .select_related('user')
            .order_by('-timestamp')
        )

        latest_logs = {}
        for log in recent_logs:
            if log.user_id not in latest_logs:
                latest_logs[log.user_id] = log

        # 2. Get active sessions (users currently inside the geofence OR in the 10-min grace period)
        sessions = (
            StaffPresenceSession.objects
            .filter(project_id=project_id, is_active=True)
            .select_related('user', 'project')
        )
        active_user_ids = {s.user_id for s in sessions}

        data = []
        for s in sessions:
            # If the user has a newer raw ping (e.g. they walked out of the geofence but are in grace period)
            # Use their TRUE physical location from the log instead of the stale geofence boundary location.
            log = latest_logs.get(s.user_id)
            if log and s.last_ping_at and log.timestamp > s.last_ping_at:
                lat = float(log.latitude) if log.latitude else None
                lon = float(log.longitude) if log.longitude else None
                ping_time = log.timestamp
                # If they are pinging outside the geofence, they are technically off-site but in grace period
                # Let's still mark them as off_site visually if the log was outside
                is_off_site = not log.is_on_site
            else:
                lat = float(s.last_known_lat) if s.last_known_lat else None
                lon = float(s.last_known_lon) if s.last_known_lon else None
                ping_time = s.last_ping_at
                is_off_site = False

            minutes_since_ping = None
            if ping_time:
                minutes_since_ping = int((timezone.now() - ping_time).total_seconds() / 60)
            
            full_name = f"{s.user.first_name} {s.user.last_name}".strip() or s.user.username
            if is_off_site:
                full_name += " (Off-Site)"

            data.append({
                "session_id": s.id,
                "user_id": s.user.id,
                "username": s.user.username,
                "full_name": full_name,
                "avatar_url": _user_avatar_url(request, s.user),
                "latitude": lat,
                "longitude": lon,
                "last_ping_at": ping_time,
                "minutes_since_ping": minutes_since_ping,
                "entry_at": s.entry_at,
                "duration_minutes": s.duration_minutes,
                "is_stale": minutes_since_ping is not None and minutes_since_ping > 5,
                "is_off_site": is_off_site,
            })

        # 3. Get true off-site users (users with no active session at all)
        for user_id, log in latest_logs.items():
            if user_id not in active_user_ids:
                minutes_since_ping = int((timezone.now() - log.timestamp).total_seconds() / 60)
                full_name = f"{log.user.first_name} {log.user.last_name}".strip() or log.user.username
                data.append({
                    "session_id": f"offsite-{log.id}",
                    "user_id": log.user.id,
                    "username": log.user.username,
                    "full_name": f"{full_name} (Off-Site)",
                    "avatar_url": _user_avatar_url(request, log.user),
                    "latitude": float(log.latitude) if log.latitude else None,
                    "longitude": float(log.longitude) if log.longitude else None,
                    "last_ping_at": log.timestamp,
                    "minutes_since_ping": minutes_since_ping,
                    "entry_at": log.timestamp,
                    "duration_minutes": 0,
                    "is_stale": minutes_since_ping > 5,
                    "is_off_site": True,
                })

        return Response(data)


class LocationHistoryView(views.APIView):
    """
    Returns all GPS pings for a specific user on a specific date.
    Used for path playback in presence reports.

    GET /api/v1/location/history/?user=<id>&date=YYYY-MM-DD&project=<id>
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.query_params.get('user')
        date_str = request.query_params.get('date')
        project_id = request.query_params.get('project')

        if not user_id or not date_str:
            return Response({"error": "user and date are required."}, status=400)

        qs = (
            StaffLocationLog.objects
            .filter(user_id=user_id, timestamp__date=date_str, is_on_site=True)
            .select_related('user', 'project', 'geofence')
            .order_by('timestamp')
        )
        if project_id:
            qs = qs.filter(project_id=project_id)

        serializer = StaffLocationLogSerializer(qs, many=True)
        return Response(serializer.data)


class PresenceAnalyticsView(viewsets.ReadOnlyModelViewSet):
    """
    Read-only view for aggregated presence sessions.
    Supports filtering by project, user, date.
    """
    queryset = StaffPresenceSession.objects.all()
    serializer_class = StaffPresenceSessionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset().select_related('user', 'project')
        project_id = self.request.query_params.get('project')
        user_id = self.request.query_params.get('user')
        date_str = self.request.query_params.get('date')

        if project_id:
            qs = qs.filter(project_id=project_id)
        if user_id:
            qs = qs.filter(user_id=user_id)
        if date_str:
            qs = qs.filter(entry_at__date=date_str)

        return qs

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Returns aggregate stats for a project on a given date.
        GET /api/v1/location/analytics/summary/?project=<id>&date=YYYY-MM-DD
        """
        project_id = request.query_params.get('project')
        date_str = request.query_params.get('date')

        qs = self.get_queryset()
        if not qs.exists():
            return Response({
                "total_sessions": 0,
                "active_count": 0,
                "unique_workers": 0,
                "total_minutes": 0,
                "avg_minutes": 0,
                "workers": [],
            })

        from django.db.models import Sum, Avg, Count
        agg = qs.aggregate(
            total_sessions=Count('id'),
            active_count=Count('id', filter=__import__('django.db.models', fromlist=['Q']).Q(is_active=True)),
            unique_workers=Count('user', distinct=True),
            total_minutes=Sum('duration_minutes'),
            avg_minutes=Avg('duration_minutes'),
        )

        # Per-worker breakdown
        from django.db.models import Q
        workers_qs = (
            qs.values('user__id', 'user__username', 'user__first_name', 'user__last_name')
            .annotate(
                sessions=Count('id'),
                total_mins=Sum('duration_minutes'),
            )
            .order_by('-total_mins')
        )
        workers = []
        for w in workers_qs:
            full_name = f"{w['user__first_name']} {w['user__last_name']}".strip() or w['user__username']
            workers.append({
                "user_id": w['user__id'],
                "username": w['user__username'],
                "full_name": full_name,
                "sessions": w['sessions'],
                "total_minutes": w['total_mins'] or 0,
            })

        return Response({
            "total_sessions": agg['total_sessions'] or 0,
            "active_count": agg['active_count'] or 0,
            "unique_workers": agg['unique_workers'] or 0,
            "total_minutes": agg['total_minutes'] or 0,
            "avg_minutes": round(agg['avg_minutes'] or 0, 1),
            "workers": workers,
        })


class SitePinViewSet(viewsets.ModelViewSet):
    """
    Full CRUD for Project Site Pins (map markers: entrance, office, store, etc.)
    GET  /api/v1/location/pins/?project=<id>
    POST /api/v1/location/pins/
    PATCH/DELETE /api/v1/location/pins/<id>/
    """
    queryset = ProjectSitePin.objects.all()
    serializer_class = ProjectSitePinSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)
        active_only = self.request.query_params.get('active')
        if active_only and active_only.lower() == 'true':
            qs = qs.filter(is_active=True)
        return qs
