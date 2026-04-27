"""
Attendance Module Models
─────────────────────────
AttendanceWorker  — a person (labour or staff) tracked per project
DailyAttendance   — one attendance record per worker per day
"""
from decimal import Decimal
from django.conf import settings
from django.db import models


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
    is_active    = models.BooleanField(default=True)
    joined_date  = models.DateField(null=True, blank=True)
    notes        = models.TextField(blank=True)
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
