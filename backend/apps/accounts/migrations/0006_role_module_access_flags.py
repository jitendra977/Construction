from django.db import migrations, models


def enable_system_admin_flags(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    Role.objects.filter(code="SUPER_ADMIN").update(
        can_manage_resources=True,
        can_manage_workforce=True,
        can_manage_data_transfer=True,
        can_manage_settings=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0005_user_digital_signature"),
    ]

    operations = [
        migrations.AddField(
            model_name="role",
            name="can_manage_resources",
            field=models.BooleanField(
                default=False,
                help_text="Can manage materials, suppliers, workers, and equipment",
            ),
        ),
        migrations.AddField(
            model_name="role",
            name="can_manage_workforce",
            field=models.BooleanField(
                default=False,
                help_text="Can manage workforce, attendance, payroll, and teams",
            ),
        ),
        migrations.AddField(
            model_name="role",
            name="can_manage_data_transfer",
            field=models.BooleanField(
                default=False,
                help_text="Can import, export, and restore system data",
            ),
        ),
        migrations.AddField(
            model_name="role",
            name="can_manage_settings",
            field=models.BooleanField(
                default=False,
                help_text="Can manage application settings",
            ),
        ),
        migrations.RunPython(enable_system_admin_flags, migrations.RunPython.noop),
    ]
