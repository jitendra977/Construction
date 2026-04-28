"""
Attendance Module Models
─────────────────────────
AttendanceWorker  — a person (labour or staff) tracked per project
DailyAttendance   — one attendance record per worker per day
QRScanLog         — immutable log of every QR scan event
"""
from decimal import Decimal
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class AttendanceWorker(models.Model):
    WORKER_TYPE_CHOICES = [
        ("LABOUR", "Daily Labour"),
        ("STAFF",  "Salaried Staff"),
    ]
    TRADE_CHOICES = [
        ("MASON",       "Mason (Dakarmi)"),
        ("HELPER",      "Helper (Jugi)"),
        ("CARPENTER",   "Carpenter (Mistri)"),
        ("ELECTRICIAN", "Electrician"),
        ("PLUMBER",     "Plumber"),
        ("PAINTER",     "Painter"),
        ("STEEL_FIXER", "Steel Fixer (Lohari)"),
        ("SUPERVISOR",  "Site Supervisor"),
        ("TILE_SETTER", "Tile Setter"),
        ("EXCAVATOR",   "Excavator Operator"),
        ("WATERPROOF",  "Waterproofing Applicator"),
        ("DRIVER",      "Driver"),
        ("SECURITY",    "Security Guard"),
        ("ENGINEER",    "Engineer"),
        ("ACCOUNTANT",  "Accountant"),
        ("MANAGER",     "Project Manager"),
        ("OTHER",       "Other"),
    ]

    project      = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE,
        related_name="attendance_workers",
    )
    name         = models.CharField(max_length=150)
    trade        = models.CharField(max_length=20, choices=TRADE_CHOICES, default="OTHER")
    worker_type  = models.CharField(max_length=10, choices=WORKER_TYPE_CHOICES, default="LABOUR")
    daily_rate   = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                       help_text="Daily wage rate in NPR")
    overtime_rate_per_hour = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                       help_text="Overtime rate per hour in NPR (0 = auto 1.5x daily/8h)")
    phone        = models.CharField(max_length=20, blank=True)
    address      = models.TextField(blank=True)
    linked_user  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="attendance_worker_profile",
        help_text="Link to system user account (for staff)",
    )
    project_member = models.OneToOneField(
        "core.ProjectMember", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="attendance_worker",
        help_text="Link to project team member (if this worker is also a team member)",
    )
    is_active    = models.BooleanField(default=True)
    joined_date  = models.DateField(null=True, blank=True)
    notes        = models.TextField(blank=True)

    # ── Resource Contractor link ───────────────────────────────
    # Links this attendance record to a resources.Contractor entry (same physical person).
    # OneToOne: one contractor → one attendance worker per project.
    contractor = models.OneToOneField(
        "resources.Contractor", null=True, blank=True,
        on_delete=models.SET_NULL, related_name="attendance_worker",
        help_text="Linked resource/contractor record for this attendance worker",
    )

    # ── Per-worker custom scan time window ─────────────────────
    # When use_custom_window=True these override the project-level ScanTimeWindow.
    use_custom_window    = models.BooleanField(
        default=False,
        help_text="Enable a custom scan time window for this worker (overrides project window)",
    )
    custom_checkin_start  = models.TimeField(null=True, blank=True, help_text="HH:MM — custom check-in window opens")
    custom_checkin_end    = models.TimeField(null=True, blank=True, help_text="HH:MM — custom check-in window closes")
    custom_checkout_start = models.TimeField(null=True, blank=True, help_text="HH:MM — custom check-out window opens")
    custom_checkout_end   = models.TimeField(null=True, blank=True, help_text="HH:MM — custom check-out window closes")

    # ── QR Attendance ──────────────────────────────────────────
    # Unique token embedded in the worker's QR code.
    # Never changes after creation — regenerating invalidates old printed badges.
    qr_token     = models.UUIDField(
        default=uuid.uuid4, unique=True, editable=False,
        help_text="Unique token embedded in QR badge. Scan to mark check-in/out.",
    )

    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        unique_together = [("project", "name")]

    def __str__(self):
        return f"{self.name} ({self.get_trade_display()}) — {self.project.name}"

    def effective_overtime_rate(self):
        """Return overtime rate per hour; default = daily_rate / 8 * 1.5"""
        if self.overtime_rate_per_hour and self.overtime_rate_per_hour > 0:
            return self.overtime_rate_per_hour
        if self.daily_rate:
            return (self.daily_rate / Decimal("8")) * Decimal("1.5")
        return Decimal("0")


class DailyAttendance(models.Model):
    STATUS_CHOICES = [
        ("PRESENT",  "Present"),
        ("ABSENT",   "Absent"),
        ("HALF_DAY", "Half Day"),
        ("LEAVE",    "Leave"),
        ("HOLIDAY",  "Holiday"),
    ]

    worker          = models.ForeignKey(
        AttendanceWorker, on_delete=models.CASCADE, related_name="attendance_records",
    )
    project         = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE, related_name="daily_attendances",
    )
    date            = models.DateField()
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default="PRESENT")
    check_in        = models.TimeField(null=True, blank=True)
    check_out       = models.TimeField(null=True, blank=True)
    overtime_hours  = models.DecimalField(max_digits=5, decimal_places=2, default=0)

    # Snapshot of rate at the time of recording (so edits to worker don't change old records)
    daily_rate_snapshot      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    overtime_rate_snapshot   = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    notes           = models.TextField(blank=True)
    recorded_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="attendance_records_created",
    )
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "worker__name"]
        unique_together = [("worker", "date")]

    def __str__(self):
        return f"{self.worker.name} — {self.date} — {self.status}"

    def save(self, *args, **kwargs):
        # Snapshot rates on first save
        if not self.pk:
            self.daily_rate_snapshot = self.worker.daily_rate
            self.overtime_rate_snapshot = self.worker.effective_overtime_rate()
        super().save(*args, **kwargs)

    @property
    def wage_earned(self):
        """Calculate wage for this record."""
        rate = self.daily_rate_snapshot
        if self.status == "PRESENT":
            base = rate
        elif self.status == "HALF_DAY":
            base = rate / Decimal("2")
        else:
            base = Decimal("0")
        overtime = self.overtime_hours * self.overtime_rate_snapshot
        return base + overtime

    @property
    def effective_days(self):
        """Present=1, Half Day=0.5, else 0"""
        if self.status == "PRESENT":
            return Decimal("1")
        elif self.status == "HALF_DAY":
            return Decimal("0.5")
        return Decimal("0")


class ScanTimeWindow(models.Model):
    """
    Admin-configurable per-project time windows for check-in / check-out.
    When is_active=True, QR scans are ONLY registered within these windows.
    """
    project        = models.OneToOneField(
        "core.HouseProject", on_delete=models.CASCADE,
        related_name="scan_time_window",
    )
    checkin_start  = models.TimeField(default="08:00", help_text="Check-in window opens (HH:MM)")
    checkin_end    = models.TimeField(default="10:00", help_text="Check-in window closes (HH:MM)")
    checkout_start = models.TimeField(default="17:00", help_text="Check-out window opens (HH:MM)")
    checkout_end   = models.TimeField(default="19:00", help_text="Check-out window closes (HH:MM)")
    is_active      = models.BooleanField(
        default=False,
        help_text="When True, scans outside configured windows are rejected.",
    )
    late_threshold_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Minutes after checkin_start before a scan is marked LATE",
    )
    early_checkout_minutes = models.PositiveIntegerField(
        default=30,
        help_text="Minutes before checkout_start before a scan is marked EARLY",
    )
    created_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="scan_windows_created",
    )
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Scan Time Window"

    def __str__(self):
        status = "ON" if self.is_active else "OFF"
        return (f"[{status}] {self.project.name} — "
                f"IN {self.checkin_start:%H:%M}–{self.checkin_end:%H:%M}  "
                f"OUT {self.checkout_start:%H:%M}–{self.checkout_end:%H:%M}")


class QRScanLog(models.Model):
    """
    Immutable log of every QR scan attempt (valid or not).
    """
    SCAN_TYPE_CHOICES = [
        ("CHECK_IN",    "Check In"),
        ("CHECK_OUT",   "Check Out"),
        ("IGNORED",     "Duplicate — ignored (cooldown)"),
        ("OUT_OF_TIME", "Out of time window — not registered"),
        ("BLOCKED",     "Blocked — wrong action for current state"),
        ("INVALID",     "Invalid QR code"),
    ]
    SCAN_STATUS_CHOICES = [
        ("VALID",       "Valid — registered"),
        ("REJECTED",    "Rejected — not registered"),
        ("DUPLICATE",   "Duplicate — cooldown active"),
    ]

    worker      = models.ForeignKey(
        AttendanceWorker, on_delete=models.CASCADE, related_name="qr_scan_logs",
    )
    attendance  = models.ForeignKey(
        DailyAttendance, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="scan_logs",
    )
    scan_type   = models.CharField(max_length=15, choices=SCAN_TYPE_CHOICES)
    scan_status = models.CharField(max_length=10, choices=SCAN_STATUS_CHOICES, default="VALID")
    is_late     = models.BooleanField(default=False, help_text="Check-in was after late threshold")
    is_early    = models.BooleanField(default=False, help_text="Check-out was before early threshold")
    scanned_at  = models.DateTimeField(default=timezone.now)
    scanned_by  = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name="qr_scans_performed",
    )
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    user_agent  = models.TextField(blank=True)
    note        = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-scanned_at"]

    def __str__(self):
        return f"{self.worker.name} — {self.scan_type} [{self.scan_status}] at {self.scanned_at:%Y-%m-%d %H:%M}"

class ProjectHoliday(models.Model):
    """
    Official holidays for a project.
    Marking a date as a holiday can trigger bulk attendance updates.
    """
    project = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE, related_name="holidays"
    )
    date    = models.DateField()
    name    = models.CharField(max_length=200, help_text="e.g. Dashain, Tihar, Workers Day")
    notes   = models.TextField(blank=True)
    applied = models.BooleanField(
        default=False,
        help_text="True once the holiday has been applied to all workers' attendance",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date"]
        unique_together = [("project", "date")]

    def __str__(self):
        return f"{self.date} — {self.name} ({self.project.name})"


class ProjectAttendanceSettings(models.Model):
    """
    Per-project attendance configuration:
    working hours, overtime rules, leave entitlements, weekend days.
    """
    DAYS = [
        (0, "Monday"), (1, "Tuesday"), (2, "Wednesday"),
        (3, "Thursday"), (4, "Friday"), (5, "Saturday"), (6, "Sunday"),
    ]

    project = models.OneToOneField(
        "core.HouseProject", on_delete=models.CASCADE,
        related_name="attendance_settings",
    )

    # ── Shift / Working Hours ─────────────────────────────────────────────────
    shift_start     = models.TimeField(default="08:00",
                        help_text="Standard shift start time")
    shift_end       = models.TimeField(default="17:00",
                        help_text="Standard shift end time")
    break_minutes   = models.PositiveIntegerField(default=60,
                        help_text="Unpaid break duration in minutes (deducted from worked hours)")
    # Standard working hours per day (after break). Used as overtime threshold.
    working_hours_per_day = models.DecimalField(
        max_digits=4, decimal_places=1, default=8,
        help_text="Standard working hours per day. Hours worked beyond this count as overtime.",
    )

    # ── Auto-overtime ─────────────────────────────────────────────────────────
    auto_overtime   = models.BooleanField(
        default=True,
        help_text="Auto-calculate overtime from check-in/out times when saving attendance",
    )

    # ── Weekend / Weekly Off ──────────────────────────────────────────────────
    # Stored as comma-separated integers: "5,6" = Sat+Sun off
    weekly_off_days = models.CharField(
        max_length=20, default="6",
        help_text="Comma-separated day numbers: 0=Mon … 6=Sun",
    )
    auto_mark_weekend_off = models.BooleanField(
        default=False,
        help_text="Auto-mark all workers as HOLIDAY on weekly off days when sheet is loaded",
    )

    # ── Holiday Auto-apply ────────────────────────────────────────────────────
    auto_apply_holiday = models.BooleanField(
        default=True,
        help_text="When a ProjectHoliday is saved, auto-mark all workers as HOLIDAY for that date",
    )

    # ── Leave Entitlement ─────────────────────────────────────────────────────
    annual_leave_days    = models.PositiveIntegerField(default=12,
                            help_text="Paid annual leave days per year")
    sick_leave_days      = models.PositiveIntegerField(default=6,
                            help_text="Paid sick leave days per year")
    leave_carry_forward  = models.BooleanField(default=False,
                            help_text="Allow unused annual leave to carry forward to next year")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Attendance Settings"

    def __str__(self):
        return f"Settings — {self.project.name}"

    @property
    def weekly_off_list(self):
        """Return weekly_off_days as a list of ints."""
        if not self.weekly_off_days:
            return []
        try:
            return [int(d.strip()) for d in self.weekly_off_days.split(",") if d.strip().isdigit()]
        except Exception:
            return []
