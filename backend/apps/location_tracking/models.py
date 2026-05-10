from django.db import models
from django.conf import settings
from apps.core.models import HouseProject


class ProjectSitePin(models.Model):
    """
    Named map markers within a project site — entrance gates, offices,
    material stores, danger zones, parking areas, etc.
    These appear as fixed icons on the live map.
    """
    class PinType(models.TextChoices):
        ENTRANCE   = 'ENTRANCE',   'Entrance / Gate'
        OFFICE     = 'OFFICE',     'Site Office'
        MATERIAL   = 'MATERIAL',   'Material Store'
        EQUIPMENT  = 'EQUIPMENT',  'Equipment Area'
        DANGER     = 'DANGER',     'Danger Zone'
        PARKING    = 'PARKING',    'Parking'
        WATER      = 'WATER',      'Water / Utilities'
        TOILET     = 'TOILET',     'Toilet / Facilities'
        FIRST_AID  = 'FIRST_AID',  'First Aid'
        OTHER      = 'OTHER',      'Other'

    project    = models.ForeignKey(
        HouseProject, on_delete=models.CASCADE, related_name='site_pins',
    )
    name       = models.CharField(max_length=100)
    pin_type   = models.CharField(
        max_length=20, choices=PinType.choices, default=PinType.OTHER,
    )
    latitude   = models.DecimalField(max_digits=22, decimal_places=16)
    longitude  = models.DecimalField(max_digits=22, decimal_places=16)
    notes      = models.TextField(blank=True, default='')
    color      = models.CharField(max_length=7, default='#64748b')
    is_active  = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering  = ['project', 'pin_type', 'name']
        indexes   = [models.Index(fields=['project', 'is_active'])]

    def __str__(self):
        return f"{self.name} ({self.get_pin_type_display()}) — {self.project.name}"


class ProjectGeofence(models.Model):
    """
    Defines a named GPS boundary zone for a project site.
    A project can have multiple geofence zones (main gate, storage, etc.)
    """
    project = models.ForeignKey(
        HouseProject,
        on_delete=models.CASCADE,
        related_name="geofences"
    )
    name = models.CharField(
        max_length=100,
        default="Main Site",
        help_text="Label for this zone (e.g. Main Gate, Material Store)"
    )
    latitude = models.DecimalField(max_digits=22, decimal_places=16)
    longitude = models.DecimalField(max_digits=22, decimal_places=16)
    radius_meters = models.PositiveIntegerField(
        default=100,
        help_text="Radius around the center point in meters"
    )
    fence_color = models.CharField(
        max_length=7,
        default="#3b82f6",
        help_text="Hex color for map rendering"
    )
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Project Geofence"
        verbose_name_plural = "Project Geofences"
        ordering = ["project", "name"]

    def __str__(self):
        return f"{self.name} — {self.project.name} ({self.radius_meters}m)"


class StaffLocationLog(models.Model):
    """
    Raw GPS data points received from staff mobile devices.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="location_logs"
    )
    latitude = models.DecimalField(max_digits=22, decimal_places=16)
    longitude = models.DecimalField(max_digits=22, decimal_places=16)
    accuracy = models.FloatField(help_text="Accuracy in meters")
    speed = models.FloatField(
        null=True, blank=True,
        help_text="Calculated speed in m/s from previous ping"
    )
    heading = models.FloatField(
        null=True, blank=True,
        help_text="Direction of travel in degrees (0=North)"
    )
    timestamp = models.DateTimeField(auto_now_add=True)

    # Contextual info calculated during save
    is_on_site = models.BooleanField(default=False)
    project = models.ForeignKey(
        HouseProject,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_pings"
    )
    geofence = models.ForeignKey(
        ProjectGeofence,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pings",
        help_text="Which specific geofence zone matched this ping"
    )

    class Meta:
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["project", "-timestamp"]),
        ]

    def __str__(self):
        return f"{self.user.username} at {self.timestamp}"


class StaffPresenceSession(models.Model):
    """
    Aggregated presence sessions (when a user was on-site).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="presence_sessions"
    )
    project = models.ForeignKey(
        HouseProject,
        on_delete=models.CASCADE,
        related_name="presence_sessions"
    )
    entry_at = models.DateTimeField()
    exit_at = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(default=0)

    # Denormalized last known position for live map display
    last_known_lat = models.DecimalField(
        max_digits=22, decimal_places=16, null=True, blank=True
    )
    last_known_lon = models.DecimalField(
        max_digits=22, decimal_places=16, null=True, blank=True
    )
    last_ping_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Timestamp of the most recent GPS ping"
    )

    is_active = models.BooleanField(
        default=True,
        help_text="True if the user is currently on site"
    )

    class Meta:
        ordering = ["-entry_at"]
        indexes = [
            models.Index(fields=["is_active", "project"]),
            models.Index(fields=["user", "-entry_at"]),
        ]

    def __str__(self):
        return f"{self.user.username} at {self.project.name} ({self.entry_at.date()})"
