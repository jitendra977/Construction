# Generated migration for MQTTConfig and MQTTScanEvent models
# These models live in mqtt_models.py, separate from the main models.py

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0008_projectattendancesettings_sound_pitch_and_more"),
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="MQTTConfig",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("broker_host", models.CharField(default="localhost", help_text="MQTT broker hostname or IP address", max_length=255)),
                ("broker_port", models.PositiveIntegerField(default=1883, help_text="MQTT TCP port (standard: 1883, TLS: 8883)")),
                ("ws_port",     models.PositiveIntegerField(default=9001, help_text="MQTT WebSocket port used by the browser client (Mosquitto default: 9001)")),
                ("topic",       models.CharField(default="nfc/+/state", help_text="MQTT topic pattern.  Use + for single-level wildcard, # for multi-level.", max_length=255)),
                ("username",    models.CharField(blank=True, default="", max_length=255)),
                ("password",    models.CharField(blank=True, default="", help_text="Stored in plaintext — use a dedicated broker user with minimal ACL", max_length=255)),
                ("use_tls",     models.BooleanField(default=False, help_text="Enable TLS/SSL on broker_port")),
                ("is_enabled",  models.BooleanField(default=True, help_text="Master switch — disable to pause the MQTT listener for this project")),
                ("connection_status", models.CharField(
                    choices=[
                        ("connected",    "Connected"),
                        ("disconnected", "Disconnected"),
                        ("error",        "Error"),
                        ("unknown",      "Unknown"),
                    ],
                    default="unknown",
                    max_length=15,
                )),
                ("last_connected_at",  models.DateTimeField(blank=True, help_text="Timestamp of the most recent successful broker connection", null=True)),
                ("last_error_message", models.CharField(blank=True, help_text="Last error from the listener process (empty when healthy)", max_length=500)),
                ("listener_pid",       models.IntegerField(blank=True, help_text="OS PID of the running mqtt_listener process (for health checks)", null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("project", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="mqtt_config",
                    to="core.houseproject",
                )),
            ],
            options={
                "verbose_name": "MQTT Configuration",
            },
        ),
        migrations.CreateModel(
            name="MQTTScanEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("topic",       models.CharField(max_length=255)),
                ("raw_payload", models.TextField(help_text="Raw JSON string exactly as received from the broker")),
                ("nfc_uid",     models.CharField(blank=True, help_text="Cleaned UID extracted from payload (spaces removed, uppercased)", max_length=100)),
                ("event_type",  models.CharField(
                    choices=[
                        ("success",  "Success — attendance recorded"),
                        ("rejected", "Rejected — duplicate / out-of-window / wrong state"),
                        ("unknown",  "Unknown UID — no matching worker"),
                        ("invalid",  "Invalid — malformed payload"),
                    ],
                    default="unknown",
                    max_length=10,
                )),
                ("message",     models.CharField(blank=True, help_text="Human-readable result", max_length=500)),
                ("worker_name", models.CharField(blank=True, help_text="Denormalised worker name snapshot for fast log display", max_length=150)),
                ("received_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("config", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="scan_events",
                    to="attendance.mqttconfig",
                )),
            ],
            options={
                "verbose_name": "MQTT Scan Event",
                "ordering": ["-received_at"],
            },
        ),
        migrations.AddIndex(
            model_name="mqttscanevent",
            index=models.Index(fields=["config", "-received_at"], name="attendance_mqtt_cfg_recv_idx"),
        ),
        migrations.AddIndex(
            model_name="mqttscanevent",
            index=models.Index(fields=["nfc_uid"], name="attendance_mqtt_uid_idx"),
        ),
    ]
