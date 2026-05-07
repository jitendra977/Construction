"""
Migration: NFC sync tracking fields

  NFCDevice.last_push_at         — when the device last received a full users/sync push
  AttendanceWorker.nfc_uid_updated_at — when the worker's NFC UID was last assigned/changed

Together these two timestamps let the dashboard show per-worker "Synced / Needs Push" status
without any additional API calls: if nfc_uid_updated_at < device.last_push_at the card is
already loaded on the device.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0015_nfcdevice_error_state"),
    ]

    operations = [
        # NFCDevice — track when the full user list was last pushed
        migrations.AddField(
            model_name="nfcdevice",
            name="last_push_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text=(
                    "Timestamp of the last successful users/sync push to this device. "
                    "Compare against AttendanceWorker.nfc_uid_updated_at to determine "
                    "whether a worker's card is already on this device."
                ),
            ),
        ),
        # AttendanceWorker — track when the NFC UID was last touched
        migrations.AddField(
            model_name="attendanceworker",
            name="nfc_uid_updated_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text=(
                    "Timestamp when nfc_uid was last assigned or changed. "
                    "Compare against NFCDevice.last_push_at to know if this worker's "
                    "card is already loaded on every device."
                ),
            ),
        ),
    ]
