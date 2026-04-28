"""
Migration 0005: Add per-worker custom scan time window fields to AttendanceWorker.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0004_scantimewindow_qrscanlog_new_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendanceworker",
            name="use_custom_window",
            field=models.BooleanField(
                default=False,
                help_text="Enable a custom scan time window for this worker (overrides project window)",
            ),
        ),
        migrations.AddField(
            model_name="attendanceworker",
            name="custom_checkin_start",
            field=models.TimeField(
                null=True, blank=True,
                help_text="HH:MM — custom check-in window opens",
            ),
        ),
        migrations.AddField(
            model_name="attendanceworker",
            name="custom_checkin_end",
            field=models.TimeField(
                null=True, blank=True,
                help_text="HH:MM — custom check-in window closes",
            ),
        ),
        migrations.AddField(
            model_name="attendanceworker",
            name="custom_checkout_start",
            field=models.TimeField(
                null=True, blank=True,
                help_text="HH:MM — custom check-out window opens",
            ),
        ),
        migrations.AddField(
            model_name="attendanceworker",
            name="custom_checkout_end",
            field=models.TimeField(
                null=True, blank=True,
                help_text="HH:MM — custom check-out window closes",
            ),
        ),
    ]
