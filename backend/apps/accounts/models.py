from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
import unicodedata
import uuid
import os
from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver

def safe_folder_name(value):
    """
    Convert text to filesystem-safe name.
    """
    value = unicodedata.normalize("NFKC", value)
    value = value.replace(" ", "_")
    return value

def user_profile_image_path(instance, filename):
    """
    media/Users/<username>/profile/profile_<uuid>.ext
    """
    ext = filename.split('.')[-1].lower()
    unique_id = uuid.uuid4().hex
    username = safe_folder_name(instance.username or "user")

    return (
        f"Users/"
        f"{username}/"
        f"profile/"
        f"profile_{unique_id}.{ext}"
    )


# ================= ROLE MODEL =================
class Role(models.Model):
    """
    Defines permission levels for the construction project users
    """
    SUPER_ADMIN = 'SUPER_ADMIN'
    HOME_OWNER = 'HOME_OWNER'
    LEAD_ENGINEER = 'LEAD_ENGINEER'
    CONTRACTOR = 'CONTRACTOR'
    VIEWER = 'VIEWER'

    ROLE_CODES = [
        (SUPER_ADMIN, 'Super Admin'),
        (HOME_OWNER, 'Home Owner'),
        (LEAD_ENGINEER, 'Lead Engineer'),
        (CONTRACTOR, 'Contractor'),
        (VIEWER, 'Viewer'),
    ]

    code = models.CharField(
        max_length=50,
        unique=True,
        choices=ROLE_CODES
    )
    name = models.CharField(max_length=50)
    
    # System Permissions (Super Admin)
    can_manage_all_systems = models.BooleanField(
        default=False,
        help_text="Full system access - can manage all data"
    )
    
    # Financial Permissions
    can_manage_finances = models.BooleanField(
        default=False,
        help_text="Can manage expenses, budgets, and payments"
    )
    can_view_finances = models.BooleanField(
        default=False,
        help_text="Can view expenses, budgets, and payments"
    )
    
    # Phase/Task Permissions
    can_manage_phases = models.BooleanField(
        default=False,
        help_text="Can manage construction phases and tasks"
    )
    can_view_phases = models.BooleanField(
        default=True,
        help_text="Can view construction phases"
    )
    
    # User Management
    can_manage_users = models.BooleanField(
        default=False,
        help_text="Can manage users and roles"
    )

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name = "Role"
        verbose_name_plural = "Roles"


# ================= USER MODEL =================
class User(AbstractUser):
    # ----- AUTH -----
    email = models.EmailField(unique=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    # ----- EXTRA INFO (Merged from Profile) -----
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    profile_image = models.ImageField(
        upload_to=user_profile_image_path,
        blank=True,
        null=True
    )
    bio = models.TextField(max_length=500, blank=True)
    address = models.TextField(blank=True)
    preferred_language = models.CharField(max_length=10, default='en')
    notifications_enabled = models.BooleanField(default=True)
    typography_settings = models.JSONField(null=True, blank=True)
    
    # ----- ROLE SYSTEM -----
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')

    # ----- EMAIL VERIFICATION -----
    is_verified = models.BooleanField(default=False)
    verification_token = models.UUIDField(null=True, blank=True)

    # ----- TIMESTAMPS -----
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    frontend_last_login = models.DateTimeField(null=True, blank=True)

    # ----- VALIDATION -----
    def clean(self):
        super().clean()
        if self.profile_image and self.profile_image.size > 5 * 1024 * 1024:
            raise ValidationError("Profile image must be under 5MB")

    # ----- HELPERS -----
    def generate_verification_token(self):
        self.verification_token = uuid.uuid4()
        self.save(update_fields=['verification_token'])

    def mark_verified(self):
        self.is_verified = True
        self.verification_token = None
        self.save(update_fields=['is_verified', 'verification_token'])

    def update_frontend_last_login(self):
        self.frontend_last_login = timezone.now()
        self.save(update_fields=['frontend_last_login'])

    def get_profile_image_url(self):
        if self.profile_image:
            return self.profile_image.url
        return f"https://ui-avatars.com/api/?name={self.username}&background=random&color=fff"

    # ----- PERMISSION CHECKERS -----
    def has_role(self, role_code):
        """Check if user has a specific role code."""
        if not self.is_active:
            return False
            
        if self.is_superuser:
            return True
            
        return self.role and self.role.code == role_code

    @property
    def is_system_admin(self):
        """Check if user is a superuser or has global system management role"""
        if not self.is_active:
            return False
        return self.is_superuser or (self.role and (self.role.can_manage_all_systems or self.role.code == Role.SUPER_ADMIN))

    @property
    def can_manage_finances_perm(self):
        if not self.is_active: return False
        return self.is_system_admin or (self.role and self.role.can_manage_finances)

    @property
    def can_view_finances_perm(self):
        if not self.is_active: return False
        return self.is_system_admin or (self.role and (self.role.can_view_finances or self.role.can_manage_finances))

    @property
    def can_manage_phases_perm(self):
        if not self.is_active: return False
        return self.is_system_admin or (self.role and self.role.can_manage_phases)

    @property
    def can_manage_users_perm(self):
        if not self.is_active: return False
        return self.is_system_admin or (self.role and self.role.can_manage_users)

    # ----- OVERRIDE SAVE -----
    def save(self, *args, **kwargs):
        # Automatically make SUPER_ADMIN users staff members for Django Admin access
        if self.role and self.role.code == Role.SUPER_ADMIN:
            self.is_staff = True
        super().save(*args, **kwargs)

    def __str__(self):
        return self.email

    class Meta:
        ordering = ['-created_at']
        verbose_name = "User"
        verbose_name_plural = "Users"


# ================= ACTIVITY LOG MODEL =================
class ActivityLog(models.Model):
    """Tracks all user activities and API calls for audit trail"""
    
    ACTION_CHOICES = [
        ('CREATE', 'Created'),
        ('UPDATE', 'Updated'),
        ('DELETE', 'Deleted'),
        ('VIEW', 'Viewed'),
        ('LOGIN', 'Logged In'),
        ('LOGOUT', 'Logged Out'),
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
        ('PAY', 'Paid'),
    ]
    
    # Who & When
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='activities',
        help_text="User who performed the action"
    )
    username = models.CharField(
        max_length=150,
        help_text="Backup username in case user is deleted"
    )
    timestamp = models.DateTimeField(
        auto_now_add=True,
        db_index=True,
        help_text="When the action occurred"
    )
    
    # What
    action = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES,
        db_index=True,
        help_text="Type of action performed"
    )
    model_name = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Name of the model affected (e.g., Expense, Phase)"
    )
    object_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text="ID of the object affected"
    )
    object_repr = models.CharField(
        max_length=200,
        help_text="Human-readable representation of the object"
    )
    
    # Details
    description = models.TextField(
        blank=True,
        help_text="Human-readable description of the action"
    )
    changes = models.JSONField(
        null=True,
        blank=True,
        help_text="Before/after values for updates"
    )
    
    # Request Info
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address of the request"
    )
    user_agent = models.TextField(
        blank=True,
        help_text="User agent string from the request"
    )
    endpoint = models.CharField(
        max_length=500,
        blank=True,
        help_text="API endpoint called"
    )
    method = models.CharField(
        max_length=10,
        blank=True,
        help_text="HTTP method (GET, POST, PUT, DELETE)"
    )
    
    # Status
    success = models.BooleanField(
        default=True,
        help_text="Whether the action completed successfully"
    )
    error_message = models.TextField(
        blank=True,
        help_text="Error message if action failed"
    )

    # Geographic Location
    city = models.CharField(max_length=100, blank=True, null=True)
    region = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = "Activity Log"
        verbose_name_plural = "Activity Logs"
        indexes = [
            models.Index(fields=['-timestamp', 'user']),
            models.Index(fields=['model_name', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.username} {self.get_action_display()} {self.model_name} at {self.timestamp}"


# ================= SIGNALS =================
@receiver(pre_save, sender=User)
def delete_old_profile_image(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old = sender.objects.get(pk=instance.pk)
    except sender.DoesNotExist:
        return

    if old.profile_image and old.profile_image != instance.profile_image:
        if old.profile_image.name and os.path.exists(old.profile_image.path):
            os.remove(old.profile_image.path)


@receiver(post_delete, sender=User)
def delete_profile_image_on_delete(sender, instance, **kwargs):
    if instance.profile_image:
        if instance.profile_image.name and os.path.exists(instance.profile_image.path):
            os.remove(instance.profile_image.path)
