from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0011_floor_project'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='room_type',
            field=models.CharField(
                max_length=20, blank=True, default='OTHER',
                choices=[
                    ('BEDROOM',   'Bedroom / सुत्ने कोठा'),
                    ('KITCHEN',   'Kitchen / भान्सा'),
                    ('BATHROOM',  'Bathroom / शौचालय'),
                    ('LIVING',    'Living Room / बैठककोठा'),
                    ('DINING',    'Dining Room / खाने कोठा'),
                    ('OFFICE',    'Office / कार्यालय'),
                    ('STORE',     'Store / भण्डार'),
                    ('STAIRCASE', 'Staircase / सिँढी'),
                    ('TERRACE',   'Terrace / छत'),
                    ('BALCONY',   'Balcony / बरन्डा'),
                    ('PUJA',      'Puja Room / पूजाकोठा'),
                    ('GARAGE',    'Garage / गाडी राख्ने'),
                    ('LAUNDRY',   'Laundry / धुलाईकोठा'),
                    ('HALL',      'Hall / हल'),
                    ('OTHER',     'Other / अन्य'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='room',
            name='ceiling_height_cm',
            field=models.IntegerField(null=True, blank=True, default=315,
                                      help_text='Ceiling height in cm (315 cm = ~10.3 ft)'),
        ),
        migrations.AddField(
            model_name='room',
            name='floor_finish',
            field=models.CharField(
                max_length=20, blank=True, default='',
                choices=[
                    ('TILE',    'Tile / टाइल'),
                    ('MARBLE',  'Marble / मार्बल'),
                    ('GRANITE', 'Granite / ग्रेनाइट'),
                    ('WOOD',    'Wood / काठ'),
                    ('CEMENT',  'Cement / सिमेन्ट'),
                    ('STONE',   'Stone / ढुङ्गा'),
                    ('OTHER',   'Other / अन्य'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='room',
            name='wall_finish',
            field=models.CharField(
                max_length=20, blank=True, default='',
                choices=[
                    ('PAINT',   'Paint / रङ'),
                    ('PLASTER', 'Plaster / लिपाइ'),
                    ('TILE',    'Tile / टाइल'),
                    ('STONE',   'Stone / ढुङ्गा'),
                    ('OTHER',   'Other / अन्य'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='room',
            name='window_count',
            field=models.PositiveSmallIntegerField(default=0,
                                                   help_text='Number of windows'),
        ),
        migrations.AddField(
            model_name='room',
            name='door_count',
            field=models.PositiveSmallIntegerField(default=1,
                                                   help_text='Number of doors'),
        ),
        migrations.AddField(
            model_name='room',
            name='notes',
            field=models.TextField(blank=True, default='',
                                   help_text='Additional remarks / टिप्पणी'),
        ),
    ]
