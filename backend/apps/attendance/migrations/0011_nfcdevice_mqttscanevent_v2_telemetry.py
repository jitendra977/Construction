"""
Migration 0011 — MQTT v2 firmware telemetry + NFC device fleet registry

Changes:
  MQTTScanEvent  — 7 new nullable/blank telemetry columns
  NFCDevice      — new model (fleet registry from nfc/announce heartbeats)
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0010_rename_attendance_mqtt_cfg_recv_idx_attendance__config__5cafc6_idx_and_more"),
        ("core", "0001_initial"),   # NFCDevice.project → core.HouseProject
    ]

    operations = [
        # ── 1. Add v2 telemetry columns to MQTTScanEvent ─────────────────────
        migrations.AddField(
            model_name="mqttscanevent",
            name="firmware_version",
            field=models.CharField(
                blank=True, max_length=20,
                help_text="Firmware version string from device (e.g. '2.1.0')",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_mode",
            field=models.CharField(
                blank=True, max_length=20,
                help_text="Device mode at scan time: door_lock / attendance / hybrid",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="gate_id",
            field=models.CharField(
                blank=True, max_length=64,
                help_text="Gate identifier configured on the device",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_uptime_ms",
            field=models.BigIntegerField(
                null=True, blank=True,
                help_text="Device uptime in milliseconds at scan time",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_rssi",
            field=models.SmallIntegerField(
                null=True, blank=True,
                help_text="WiFi RSSI in dBm at scan time (e.g. -65)",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_free_heap",
            field=models.IntegerField(
                null=True, blank=True,
                help_text="Free heap RAM in bytes at scan time",
            ),
        ),
        migrations.AddField(
            model_name="mqttscanevent",
            name="device_scan_no",
            field=models.IntegerField(
                null=True, blank=True,
                help_text="Monotonic scan counter on the device since last reboot",
            ),
        ),

        # ── 2. Create NFCDevice model ─────────────────────────────────────────
        migrations.CreateModel(
            name="NFCDevice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True,
                                           serialize=False, verbose_name="ID")),
                ("mac", models.CharField(
                    max_length=17, unique=True,
                    help_text="Device MAC address (XX:XX:XX:XX:XX:XX)",
                )),
                ("device_name", models.CharField(max_length=64, blank=True)),
                ("project", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="nfc_devices",
                    to="core.houseproject",
                    help_text="Project this device belongs to",
                )),
                ("gate_id",          models.CharField(max_length=64, blank=True)),
                ("device_mode",      models.CharField(
                    max_length=20, blank=True,
                    choices=[
                        ("door_lock",  "Door Lock — relay control only"),
                        ("attendance", "Attendance — MQTT scan events only"),
                        ("hybrid",     "Hybrid — relay + attendance"),
                        ("unknown",    "Unknown"),
                    ],
                    default="unknown",
                )),
                ("firmware_version", models.CharField(max_length=20, blank=True)),
                ("ip_address",       models.CharField(max_length=45, blank=True,
                                                      help_text="Last known IP address")),
                ("total_scans",      models.PositiveIntegerField(default=0)),
                ("first_seen",       models.DateTimeField(auto_now_add=True)),
                ("last_seen",        models.DateTimeField(auto_now=True)),
            ],
            options={
                "verbose_name": "NFC Device",
                "ordering": ["-last_seen"],
            },
        ),
        migrations.AddIndex(
            model_name="nfcdevice",
            index=models.Index(fields=["project", "-last_seen"],
                               name="attendance__nfc_dev_proj_idx"),
        ),
    ]
