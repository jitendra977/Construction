"""
Migration 0012 — Offline-queue fields on MQTTScanEvent

Adds:
  device_timestamp  — original scan time from device (ts field), NULL for live scans
  is_queued         — True when the scan was buffered on device while MQTT was offline
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0011_nfcdevice_mqttscanevent_v2_telemetry"),
    ]

    operations = [
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_timestamp",
            field=models.DateTimeField(
                null=True,
                blank=True,
                help_text=(
                    "Original scan time from the device (ts field). "
                    "Non-null only for queued=1 scans replayed after reconnect."
                ),
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="is_queued",
            field=models.BooleanField(
                default=False,
                help_text="True when scan was buffered on device while MQTT was offline.",
            ),
        ),
    ]
