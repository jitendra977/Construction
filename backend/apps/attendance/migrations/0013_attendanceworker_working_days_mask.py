"""
Migration 0013 — working_days_mask on AttendanceWorker

Adds:
  working_days_mask  — integer bitmask of allowed work days (bit0=Sun … bit6=Sat).
                        Default 127 = all days allowed.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0012_mqttscanevent_device_timestamp_is_queued"),
        ("attendance", "0012_rename_attendance__nfc_dev_proj_idx_attendance__project_4d5bdf_idx_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendanceworker",
            name="working_days_mask",
            field=models.IntegerField(
                default=127,
                help_text="Bitmask of allowed work days (bit0=Sun … bit6=Sat). 127=all days.",
            ),
        ),
    ]
