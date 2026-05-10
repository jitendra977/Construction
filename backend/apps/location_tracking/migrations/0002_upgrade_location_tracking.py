from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_initial'),
        ('location_tracking', '0001_initial'),
    ]

    operations = [
        # ── 1. ProjectGeofence: OneToOneField → ForeignKey + new fields ──────
        migrations.AlterField(
            model_name='projectgeofence',
            name='project',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='geofences',
                to='core.houseproject',
            ),
        ),
        migrations.AddField(
            model_name='projectgeofence',
            name='name',
            field=models.CharField(
                default='Main Site',
                max_length=100,
                help_text='Label for this zone (e.g. Main Gate, Material Store)',
            ),
        ),
        migrations.AddField(
            model_name='projectgeofence',
            name='fence_color',
            field=models.CharField(
                default='#3b82f6',
                max_length=7,
                help_text='Hex color for map rendering',
            ),
        ),
        migrations.AlterModelOptions(
            name='projectgeofence',
            options={
                'ordering': ['project', 'name'],
                'verbose_name': 'Project Geofence',
                'verbose_name_plural': 'Project Geofences',
            },
        ),

        # ── 2. StaffLocationLog: speed, heading, geofence FK, new index ──────
        migrations.AddField(
            model_name='stafflocationlog',
            name='speed',
            field=models.FloatField(
                blank=True, null=True,
                help_text='Calculated speed in m/s from previous ping',
            ),
        ),
        migrations.AddField(
            model_name='stafflocationlog',
            name='heading',
            field=models.FloatField(
                blank=True, null=True,
                help_text='Direction of travel in degrees (0=North)',
            ),
        ),
        migrations.AddField(
            model_name='stafflocationlog',
            name='geofence',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='pings',
                to='location_tracking.projectgeofence',
                help_text='Which specific geofence zone matched this ping',
            ),
        ),
        migrations.AddIndex(
            model_name='stafflocationlog',
            index=models.Index(
                fields=['project', '-timestamp'],
                name='loc_log_project_ts_idx',
            ),
        ),

        # ── 3. StaffPresenceSession: last known coords + indexes ─────────────
        migrations.AddField(
            model_name='staffpresencesession',
            name='last_known_lat',
            field=models.DecimalField(
                blank=True, decimal_places=16, max_digits=22, null=True,
            ),
        ),
        migrations.AddField(
            model_name='staffpresencesession',
            name='last_known_lon',
            field=models.DecimalField(
                blank=True, decimal_places=16, max_digits=22, null=True,
            ),
        ),
        migrations.AddField(
            model_name='staffpresencesession',
            name='last_ping_at',
            field=models.DateTimeField(
                blank=True, null=True,
                help_text='Timestamp of the most recent GPS ping',
            ),
        ),
        migrations.AddIndex(
            model_name='staffpresencesession',
            index=models.Index(
                fields=['is_active', 'project'],
                name='loc_session_active_proj_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='staffpresencesession',
            index=models.Index(
                fields=['user', '-entry_at'],
                name='loc_session_user_entry_idx',
            ),
        ),
    ]
