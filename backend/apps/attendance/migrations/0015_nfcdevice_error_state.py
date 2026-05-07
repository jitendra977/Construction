"""
Migration: add error_state + error_since to NFCDevice
Generated manually to match mqtt_models.NFCDevice changes.
"""

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0014_alter_mqttscanevent_device_timestamp"),
    ]

    operations = [
        migrations.AddField(
            model_name="nfcdevice",
            name="error_state",
            field=models.CharField(
                blank=True,
                default="",
                help_text=(
                    "Last error reported by the device via nfc/<mac>/error_state.  "
                    "Empty or 'OK' means all systems healthy.  "
                    "Possible values: 'No Wi-Fi', 'No MQTT', 'PN532 Error', 'Door Left Open'."
                ),
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="nfcdevice",
            name="error_since",
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text="Timestamp when the current error condition first appeared.",
            ),
        ),
    ]
