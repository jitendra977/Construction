from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0013_room_mep_schedule_properties'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectMember',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(
                    max_length=20,
                    choices=[
                        ('OWNER',      'Owner / मालिक'),
                        ('MANAGER',    'Project Manager / परियोजना प्रबन्धक'),
                        ('ENGINEER',   'Engineer / इन्जिनियर'),
                        ('SUPERVISOR', 'Supervisor / सुपरभाइजर'),
                        ('CONTRACTOR', 'Contractor / ठेकेदार'),
                        ('VIEWER',     'Viewer / दर्शक'),
                    ],
                    default='VIEWER',
                )),
                ('note', models.CharField(
                    max_length=200, blank=True, default='',
                    help_text="Short note e.g. 'Lead civil engineer'",
                )),
                ('joined_at', models.DateTimeField(auto_now_add=True)),
                ('project', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='members',
                    to='core.houseproject',
                )),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='project_memberships',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Project Member',
                'verbose_name_plural': 'Project Members',
                'ordering': ['role', 'joined_at'],
            },
        ),
        migrations.AddConstraint(
            model_name='projectmember',
            constraint=models.UniqueConstraint(
                fields=['project', 'user'],
                name='unique_project_user',
            ),
        ),
    ]
