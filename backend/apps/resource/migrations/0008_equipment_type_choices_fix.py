"""
Migration: replace generic EquipmentType choices with specific equipment names
matching the frontend options.

Old choices: HEAVY, LIGHT, TOOL, VEHICLE, OTHER
New choices: EXCAVATOR, CRANE, BULLDOZER, MIXER, GENERATOR,
             COMPACTOR, TRUCK, LOADER, DRILL, SCAFFOLDING, OTHER

Any existing rows with old generic types are converted to OTHER.
"""
from django.db import migrations, models

OLD_TYPES = ['HEAVY', 'LIGHT', 'TOOL', 'VEHICLE']


def convert_old_types_to_other(apps, schema_editor):
    Equipment = apps.get_model('resource', 'Equipment')
    Equipment.objects.filter(equipment_type__in=OLD_TYPES).update(equipment_type='OTHER')


def revert_to_other(apps, schema_editor):
    pass  # irreversible — all become OTHER on both sides


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0007_material_unit_choices_fix'),
    ]

    operations = [
        migrations.RunPython(convert_old_types_to_other, revert_to_other),

        migrations.AlterField(
            model_name='equipment',
            name='equipment_type',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('EXCAVATOR',   'Excavator'),
                    ('CRANE',       'Crane'),
                    ('BULLDOZER',   'Bulldozer'),
                    ('MIXER',       'Mixer'),
                    ('GENERATOR',   'Generator'),
                    ('COMPACTOR',   'Compactor'),
                    ('TRUCK',       'Truck'),
                    ('LOADER',      'Loader'),
                    ('DRILL',       'Drill'),
                    ('SCAFFOLDING', 'Scaffolding'),
                    ('OTHER',       'Other'),
                ],
                default='OTHER',
            ),
        ),
    ]
