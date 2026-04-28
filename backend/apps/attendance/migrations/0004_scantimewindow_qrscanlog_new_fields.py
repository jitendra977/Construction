"""
Migration 0004: Add ScanTimeWindow model + extend QRScanLog with
  scan_status, is_late, is_early fields; widen scan_type and note max_length.
"""
import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0003_qr_token_and_scan_log"),
        ("core", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── ScanTimeWindow ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name="ScanTimeWindow",
            fields=[
                ("id", models.BigAutoField(
                    auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                )),
                ("checkin_start", models.TimeField(
                    default="08:00",
                    help_text="Check-in window opens (HH:MM)",
                )),
                ("checkin_end", models.TimeField(
                    default="10:00",
                    help_text="Check-in window closes (HH:MM)",
                )),
                ("checkout_start", models.TimeField(
                    default="17:00",
                    help_text="Check-out window opens (HH:MM)",
                )),
                ("checkout_end", models.TimeField(
                    default="19:00",
                    help_text="Check-out window closes (HH:MM)",
                )),
                ("is_active", models.BooleanField(
                    default=False,
                    help_text="When True, scans outside configured windows are rejected.",
                )),
                ("late_threshold_minutes", models.PositiveIntegerField(
                    default=30,
                    help_text="Minutes after checkin_start before a scan is marked LATE",
                )),
                ("early_checkout_minutes", models.PositiveIntegerField(
                    default=30,
                    help_text="Minutes before checkout_start before a scan is marked EARLY",
                )),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("project", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="scan_time_window",
                    to="core.houseproject",
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="scan_windows_created",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"verbose_name": "Scan Time Window"},
        ),

        # ── QRScanLog — extend scan_type max_length (10→15) ───────────────────
        migrations.AlterField(
            model_name="qrscanlog",
            name="scan_type",
            field=models.CharField(
                max_length=15,
                choices=[
                    ("CHECK_IN",    "Check In"),
                    ("CHECK_OUT",   "Check Out"),
                    ("IGNORED",     "Duplicate — ignored (cooldown)"),
                    ("OUT_OF_TIME", "Out of time window — not registered"),
                    ("BLOCKED",     "Blocked — wrong action for current state"),
                    ("INVALID",     "Invalid QR code"),
                ],
            ),
        ),

        # ── QRScanLog — extend note max_length (200→300) ──────────────────────
        migrations.AlterField(
            model_name="qrscanlog",
            name="note",
            field=models.CharField(max_length=300, blank=True),
        ),

        # ── QRScanLog — add scan_status ────────────────────────────────────────
        migrations.AddField(
            model_name="qrscanlog",
            name="scan_status",
            field=models.CharField(
                max_length=10,
                default="VALID",
                choices=[
                    ("VALID",     "Valid — registered"),
                    ("REJECTED",  "Rejected — not registered"),
                    ("DUPLICATE", "Duplicate — cooldown active"),
                ],
            ),
        ),

        # ── QRScanLog — add is_late ────────────────────────────────────────────
        migrations.AddField(
            model_name="qrscanlog",
            name="is_late",
            field=models.BooleanField(
                default=False,
                help_text="Check-in was after late threshold",
            ),
        ),

        # ── QRScanLog — add is_early ───────────────────────────────────────────
        migrations.AddField(
            model_name="qrscanlog",
            name="is_early",
            field=models.BooleanField(
                default=False,
                help_text="Check-out was before early threshold",
            ),
        ),
    ]
