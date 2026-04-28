from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("attendance", "0006_attendanceworker_contractor"),
        ("core", "0001_initial"),
    ]

    operations = [
        # 1. Add ProjectHoliday (was in models but never migrated)
        migrations.CreateModel(
            name="ProjectHoliday",
            fields=[
                ("id",         models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date",       models.DateField()),
                ("name",       models.CharField(max_length=200, help_text="e.g. Dashain, Tihar, Workers Day")),
                ("notes",      models.TextField(blank=True)),
                ("applied",    models.BooleanField(default=False, help_text="True once applied to all workers' attendance")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("project",    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="holidays", to="core.houseproject")),
            ],
            options={"ordering": ["-date"]},
        ),
        migrations.AlterUniqueTogether(
            name="projectholiday",
            unique_together={("project", "date")},
        ),

        # 2. Add ProjectAttendanceSettings
        migrations.CreateModel(
            name="ProjectAttendanceSettings",
            fields=[
                ("id",                    models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("shift_start",           models.TimeField(default="08:00", help_text="Standard shift start time")),
                ("shift_end",             models.TimeField(default="17:00", help_text="Standard shift end time")),
                ("break_minutes",         models.PositiveIntegerField(default=60, help_text="Unpaid break duration in minutes")),
                ("working_hours_per_day", models.DecimalField(decimal_places=1, default=8, help_text="Standard working hours per day", max_digits=4)),
                ("auto_overtime",         models.BooleanField(default=True, help_text="Auto-calculate overtime from check-in/out times")),
                ("weekly_off_days",       models.CharField(default="6", help_text="Comma-separated: 0=Mon … 6=Sun", max_length=20)),
                ("auto_mark_weekend_off", models.BooleanField(default=False, help_text="Auto-mark HOLIDAY on weekly off days")),
                ("auto_apply_holiday",    models.BooleanField(default=True, help_text="Auto-mark workers HOLIDAY when ProjectHoliday saved")),
                ("annual_leave_days",     models.PositiveIntegerField(default=12, help_text="Paid annual leave days per year")),
                ("sick_leave_days",       models.PositiveIntegerField(default=6, help_text="Paid sick leave days per year")),
                ("leave_carry_forward",   models.BooleanField(default=False, help_text="Unused leave carries forward")),
                ("created_at",            models.DateTimeField(auto_now_add=True)),
                ("updated_at",            models.DateTimeField(auto_now=True)),
                ("project",               models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="attendance_settings", to="core.houseproject")),
            ],
            options={"verbose_name": "Attendance Settings"},
        ),
    ]
