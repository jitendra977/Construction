"""
Migration 0006: Add contractor FK to AttendanceWorker.
Links attendance.AttendanceWorker ↔ resources.Contractor (same physical person).
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0005_worker_custom_time_window"),
        ("resources", "0013_contractor_project_material_project"),
    ]

    operations = [
        migrations.AddField(
            model_name="attendanceworker",
            name="contractor",
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="attendance_worker",
                to="resources.contractor",
                help_text="Linked resource/contractor record for this attendance worker",
            ),
        ),
    ]
