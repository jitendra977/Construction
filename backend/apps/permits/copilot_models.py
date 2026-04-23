"""
Permit Co-Pilot models.

MunicipalityTemplate  — a permit blueprint per municipality/ward: the
                        steps, required documents and fees.
MunicipalityStep      — an individual step on that blueprint.
DocumentTemplate      — metadata about a required document (purpose,
                        typical source, PDF/photo, sample file).
PermitChecklist       — materialised per-project checklist derived from
                        a MunicipalityTemplate, with live status per step.
ChecklistItem         — one actionable row on a PermitChecklist.
DeadlineReminder      — per-item SLA/deadline that the reminder engine
                        watches; the ops cron marks overdue items so the
                        UI can badge them.
"""
from django.conf import settings
from django.db import models


# ─── Reusable blueprint ──────────────────────────────────────────────
class MunicipalityTemplate(models.Model):
    """A reusable permit pipeline for a municipality or ward."""

    name = models.CharField(max_length=200)
    municipality = models.CharField(max_length=200)
    ward = models.CharField(max_length=20, blank=True)
    province = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    version = models.CharField(max_length=20, default="1.0")
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["municipality", "name"]

    def __str__(self):
        return f"{self.name} — {self.municipality}"


class MunicipalityStep(models.Model):
    template = models.ForeignKey(
        MunicipalityTemplate, on_delete=models.CASCADE, related_name="steps"
    )
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    typical_days = models.PositiveIntegerField(default=7, help_text="SLA hint")
    fee_estimate = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    required_documents = models.ManyToManyField(
        "DocumentTemplate", blank=True, related_name="steps"
    )

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.template.name}: {self.title}"


class DocumentTemplate(models.Model):
    """Blueprint for required documents (Lalpurja, Nagrikta, Naksha, …)."""

    CATEGORY_CHOICES = [
        ("LAND", "Land Ownership"),
        ("ID", "Citizenship/ID"),
        ("DRAWING", "Drawings / Naksha"),
        ("APPROVAL", "Approval / Endorsement"),
        ("FEE", "Fee Receipt"),
        ("OTHER", "Other"),
    ]

    key = models.CharField(max_length=50, unique=True)
    label = models.CharField(max_length=200)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    sample_file = models.FileField(upload_to="permit-samples/", null=True, blank=True)
    source_hint = models.CharField(
        max_length=200, blank=True,
        help_text="Where to get this — e.g. 'Malpot Karyalaya'",
    )

    def __str__(self):
        return self.label


# ─── Project-specific materialisation ────────────────────────────────
class PermitChecklist(models.Model):
    """Per-project snapshot of a municipality template."""

    STATUS_CHOICES = [
        ("DRAFT", "Draft"),
        ("IN_PROGRESS", "In Progress"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    project = models.ForeignKey(
        "core.HouseProject", on_delete=models.CASCADE, related_name="permit_checklists"
    )
    template = models.ForeignKey(
        MunicipalityTemplate, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="checklists",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    started_at = models.DateField(null=True, blank=True)
    target_completion = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def progress_pct(self):
        total = self.items.count()
        if not total:
            return 0
        done = self.items.filter(status="DONE").count()
        return round(done * 100 / total, 1)

    def __str__(self):
        return f"{self.project} — {self.template or 'custom'}"


class ChecklistItem(models.Model):
    STATUS_CHOICES = [
        ("TODO", "To Do"),
        ("GATHERING", "Gathering Docs"),
        ("SUBMITTED", "Submitted"),
        ("DONE", "Done"),
        ("BLOCKED", "Blocked"),
    ]

    checklist = models.ForeignKey(
        PermitChecklist, on_delete=models.CASCADE, related_name="items"
    )
    source_step = models.ForeignKey(
        MunicipalityStep, on_delete=models.SET_NULL, null=True, blank=True
    )
    order = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="TODO")

    due_date = models.DateField(null=True, blank=True)
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="permit_items",
    )
    attached_documents = models.ManyToManyField(
        "resources.Document", blank=True, related_name="permit_items"
    )
    fee_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    completed_at = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.title} ({self.status})"


class DeadlineReminder(models.Model):
    """Reminder / overdue-tracking for a checklist item."""

    STATUS_CHOICES = [
        ("SCHEDULED", "Scheduled"),
        ("SENT", "Sent"),
        ("OVERDUE", "Overdue"),
        ("CLEARED", "Cleared"),
    ]

    item = models.ForeignKey(
        ChecklistItem, on_delete=models.CASCADE, related_name="reminders"
    )
    remind_on = models.DateField()
    message = models.CharField(max_length=300)
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="SCHEDULED")
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["remind_on"]

    def __str__(self):
        return f"Reminder: {self.item.title} on {self.remind_on}"
