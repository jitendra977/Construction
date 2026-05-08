from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_assigned_projects'),
        ('core', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='active_project',
            field=models.ForeignKey(
                blank=True,
                help_text='Last project the user was working on — auto-restored on next login',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='active_for_users',
                to='core.houseproject',
            ),
        ),
    ]
