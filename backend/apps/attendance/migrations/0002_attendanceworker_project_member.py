from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='attendanceworker',
            name='project_member',
            field=models.OneToOneField(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='attendance_worker',
                to='core.projectmember',
                help_text='Link to project team member (if this worker is also a team member)',
            ),
        ),
    ]
