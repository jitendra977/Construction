from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_initial'),
        ('location_tracking', '0003_rename_loc_log_project_ts_idx_location_tr_project_9f0a3b_idx_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectSitePin',
            fields=[
                ('id',        models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name',      models.CharField(max_length=100)),
                ('pin_type',  models.CharField(
                    choices=[
                        ('ENTRANCE',  'Entrance / Gate'),
                        ('OFFICE',    'Site Office'),
                        ('MATERIAL',  'Material Store'),
                        ('EQUIPMENT', 'Equipment Area'),
                        ('DANGER',    'Danger Zone'),
                        ('PARKING',   'Parking'),
                        ('WATER',     'Water / Utilities'),
                        ('TOILET',    'Toilet / Facilities'),
                        ('FIRST_AID', 'First Aid'),
                        ('OTHER',     'Other'),
                    ],
                    default='OTHER', max_length=20,
                )),
                ('latitude',   models.DecimalField(decimal_places=16, max_digits=22)),
                ('longitude',  models.DecimalField(decimal_places=16, max_digits=22)),
                ('notes',      models.TextField(blank=True, default='')),
                ('color',      models.CharField(default='#64748b', max_length=7)),
                ('is_active',  models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('project',    models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='site_pins',
                    to='core.houseproject',
                )),
            ],
            options={
                'ordering': ['project', 'pin_type', 'name'],
            },
        ),
        migrations.AddIndex(
            model_name='projectsitepin',
            index=models.Index(fields=['project', 'is_active'], name='loc_pin_project_active_idx'),
        ),
    ]
