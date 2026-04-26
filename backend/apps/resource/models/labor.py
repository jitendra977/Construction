"""
Labor — workforce management
"""
import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum, Count, Q


class Worker(models.Model):

    class Role(models.TextChoices):
        MASON       = "MASON",       "Mason"
        CARPENTER   = "CARPENTER",   "Carpenter"
        ELECTRICIAN = "ELECTRICIAN", "Electrician"
        PLUMBER     = "PLUMBER",     "Plumber"
        PAINTER     = "PAINTER",     "Painter"
        LABORER     = "LABORER",     "Laborer"
        SUPERVISOR  = "SUPERVISOR",  "Supervisor"
        ENGINEER    = "ENGINEER",    "Engineer"
        OTHER       = "OTHER",       "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="resource_workers",
    )
    name        = models.CharField(max_length=255)
    role        = models.CharField(max_length=20, choices=Role.choices, default=Role.LABORER)
    daily_wage  = models.DecimalField(max_digits=15, decimal_places=2)
    phone       = models.CharField(max_length=20, blank=True, default="")
    address     = models.TextField(blank=True, default="")
    is_active   = models.BooleanField(default=True)
    joined_date = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        app_label = "resource"
        ordering  = ["name"]
        verbose_name = "Worker"
        verbose_name_plural = "Workers"

    def __str__(self):
        return f"{self.name} ({self.get_role_display()})"

    @property
    def total_days_worked(self) -> int:
        return self.attendances.filter(is_present=True).count()

    @property
    def total_earnings(self) -> Decimal:
        agg = self.attendances.filter(is_present=True).aggregate(
            days=Count("id"),
            overtime=Sum("overtime_hours"),
        )
        days     = agg["days"]     or 0
        overtime = agg["overtime"] or Decimal("0")
        return (Decimal(days) * self.daily_wage) + (overtime * self.daily_wage / Decimal("8"))


class WorkerAttendance(models.Model):
    id     = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    worker = models.ForeignKey(
        Worker,
        on_delete=models.CASCADE,
        related_name="attendances",
    )
    date           = models.DateField()
    is_present     = models.BooleanField(default=True)
    overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    notes          = models.TextField(blank=True, default="")

    class Meta:
        app_label = "resource"
        ordering  = ["-date"]
        unique_together = [("worker", "date")]
        verbose_name = "Worker Attendance"
        verbose_name_plural = "Worker Attendances"

    def __str__(self):
        status = "Present" if self.is_present else "Absent"
        return f"{self.worker.name} – {self.date} – {status}"
