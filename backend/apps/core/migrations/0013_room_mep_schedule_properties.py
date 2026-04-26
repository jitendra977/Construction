from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0012_room_extra_properties'),
    ]

    operations = [
        # ── Finishes ─────────────────────────────────────────────────────────
        migrations.AddField(
            model_name='room',
            name='color_scheme',
            field=models.CharField(max_length=100, blank=True, default='',
                                   help_text="Wall paint color name or code e.g. 'Off-White #F5F5F5'"),
        ),
        # ── MEP points ───────────────────────────────────────────────────────
        migrations.AddField(
            model_name='room',
            name='electrical_points',
            field=models.PositiveSmallIntegerField(default=0,
                                                   help_text='Switch/socket outlet points'),
        ),
        migrations.AddField(
            model_name='room',
            name='light_points',
            field=models.PositiveSmallIntegerField(default=0,
                                                   help_text='Light fixture / batten points'),
        ),
        migrations.AddField(
            model_name='room',
            name='fan_points',
            field=models.PositiveSmallIntegerField(default=0,
                                                   help_text='Ceiling fan provision points'),
        ),
        migrations.AddField(
            model_name='room',
            name='ac_provision',
            field=models.BooleanField(default=False,
                                      help_text='AC outdoor unit provision (conduit + bracket)'),
        ),
        migrations.AddField(
            model_name='room',
            name='plumbing_points',
            field=models.PositiveSmallIntegerField(default=0,
                                                   help_text='Water supply + drain connection points'),
        ),
        # ── Scheduling ───────────────────────────────────────────────────────
        migrations.AddField(
            model_name='room',
            name='priority',
            field=models.CharField(
                max_length=10, blank=True, default='MEDIUM',
                choices=[
                    ('HIGH',   'High / उच्च'),
                    ('MEDIUM', 'Medium / मध्यम'),
                    ('LOW',    'Low / कम'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='room',
            name='completion_date',
            field=models.DateField(null=True, blank=True,
                                   help_text='Actual or target completion date'),
        ),
    ]
