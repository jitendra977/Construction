from django.db import migrations, models


def seed_view_permissions(apps, schema_editor):
    ProjectRole = apps.get_model("core", "ProjectRole")
    ProjectMember = apps.get_model("core", "ProjectMember")

    role_defaults = {
        "OWNER": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": True,
        },
        "MANAGER": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": True,
        },
        "ENGINEER": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": True,
        },
        "SUPERVISOR": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": True,
        },
        "CONTRACTOR": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": False,
        },
        "VIEWER": {
            "can_view_members": True,
            "can_view_phases": True,
            "can_view_structure": True,
            "can_view_resources": True,
            "can_view_workforce": True,
        },
    }

    for project_role in ProjectRole.objects.all():
        defaults = role_defaults.get(project_role.code, {})
        project_role.can_view_members = defaults.get("can_view_members", project_role.can_manage_members)
        project_role.can_view_phases = defaults.get("can_view_phases", project_role.can_manage_phases)
        project_role.can_view_structure = defaults.get("can_view_structure", project_role.can_manage_structure)
        project_role.can_view_resources = defaults.get("can_view_resources", project_role.can_manage_resources)
        project_role.can_view_workforce = defaults.get("can_view_workforce", project_role.can_manage_workforce)
        project_role.save(update_fields=[
            "can_view_members",
            "can_view_phases",
            "can_view_structure",
            "can_view_resources",
            "can_view_workforce",
        ])

    for member in ProjectMember.objects.all():
        defaults = role_defaults.get(member.role, {})
        member.can_view_members = defaults.get("can_view_members", True)
        member.can_view_phases = defaults.get("can_view_phases", True)
        member.can_view_structure = defaults.get("can_view_structure", True)
        member.can_view_resources = defaults.get("can_view_resources", True)
        member.can_view_workforce = defaults.get("can_view_workforce", member.can_manage_workforce)
        member.save(update_fields=[
            "can_view_members",
            "can_view_phases",
            "can_view_structure",
            "can_view_resources",
            "can_view_workforce",
        ])


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0006_projectrole_alter_projectmember_role"),
    ]

    operations = [
        migrations.AddField(
            model_name="projectrole",
            name="can_view_members",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="projectrole",
            name="can_view_phases",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="projectrole",
            name="can_view_structure",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="projectrole",
            name="can_view_resources",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="projectrole",
            name="can_view_workforce",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="projectmember",
            name="can_view_members",
            field=models.BooleanField(default=True, help_text="Read-only access to project members"),
        ),
        migrations.AddField(
            model_name="projectmember",
            name="can_view_phases",
            field=models.BooleanField(default=True, help_text="Read-only access to phases and tasks"),
        ),
        migrations.AddField(
            model_name="projectmember",
            name="can_view_structure",
            field=models.BooleanField(default=True, help_text="Read-only access to floors and rooms"),
        ),
        migrations.AddField(
            model_name="projectmember",
            name="can_view_resources",
            field=models.BooleanField(default=True, help_text="Read-only access to materials, suppliers, and purchases"),
        ),
        migrations.AddField(
            model_name="projectmember",
            name="can_view_workforce",
            field=models.BooleanField(default=True, help_text="Read-only access to attendance, teams, and payroll summaries"),
        ),
        migrations.RunPython(seed_view_permissions, migrations.RunPython.noop),
    ]
