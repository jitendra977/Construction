from django.db import migrations, models


def enable_default_view_flags(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.update(can_view_projects=True, can_view_dashboard=True)
    Role.objects.filter(can_manage_resources=True).update(can_view_resources=True)
    Role.objects.filter(can_manage_workforce=True).update(can_view_workforce=True)
    Role.objects.filter(code="SUPER_ADMIN").update(
        can_manage_projects=True,
        can_view_resources=True,
        can_view_workforce=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0006_role_module_access_flags"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="can_view_projects",
            field=models.BooleanField(default=True, help_text="Can view assigned projects"),
        ),
        migrations.AddField(
            model_name="role",
            name="can_manage_projects",
            field=models.BooleanField(default=False, help_text="Can create, edit, and delete projects"),
        ),
        migrations.AddField(
            model_name="role",
            name="can_view_dashboard",
            field=models.BooleanField(
                default=True,
                help_text="Can view dashboard, analytics, estimator, gallery, guides, and timelapse",
            ),
        ),
        migrations.AddField(
            model_name="role",
            name="can_view_resources",
            field=models.BooleanField(
                default=False,
                help_text="Can view materials, suppliers, workers, and equipment",
            ),
        ),
        migrations.AddField(
            model_name="role",
            name="can_view_workforce",
            field=models.BooleanField(
                default=False,
                help_text="Can view workforce, attendance, payroll, and teams",
            ),
        ),
        migrations.RunPython(enable_default_view_flags, migrations.RunPython.noop),
    ]
