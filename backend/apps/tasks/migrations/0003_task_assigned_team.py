import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('tasks', '0002_switch_task_assigned_to_workforce_member'),
        ('workforce', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='assigned_team',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='assigned_tasks',
                to='workforce.team',
                help_text='Auto-set when 2+ workers are assigned to this task via WorkerAssignment.',
            ),
        ),
    ]
