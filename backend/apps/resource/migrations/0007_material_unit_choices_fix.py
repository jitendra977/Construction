"""
Migration: fix Material.unit choices to match frontend values.

Before: uppercase codes (KG, BAG, PIECE, METER, SQ_METER, CU_METER, LITER, TON)
After:  lowercase codes matching the frontend (kg, ton, bag, pcs, ft, m, m2, m3, ltr, bundle, box, roll)

The data migration step converts any existing rows with old uppercase values.
"""
from django.db import migrations, models


# Map old uppercase values → new lowercase values
UNIT_MAP = {
    'KG':       'kg',
    'TON':      'ton',
    'BAG':      'bag',
    'PIECE':    'pcs',
    'METER':    'm',
    'SQ_METER': 'm2',
    'CU_METER': 'm3',
    'LITER':    'ltr',
}


def convert_units_to_lowercase(apps, schema_editor):
    Material = apps.get_model('resource', 'Material')
    for old, new in UNIT_MAP.items():
        Material.objects.filter(unit=old).update(unit=new)


def revert_units_to_uppercase(apps, schema_editor):
    Material = apps.get_model('resource', 'Material')
    for old, new in UNIT_MAP.items():
        Material.objects.filter(unit=new).update(unit=old)


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0006_add_wastage_models'),
    ]

    operations = [
        # Step 1: convert existing data before changing the field choices
        migrations.RunPython(convert_units_to_lowercase, revert_units_to_uppercase),

        # Step 2: update field definition with new choices and default
        migrations.AlterField(
            model_name='material',
            name='unit',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('kg',     'kg'),
                    ('ton',    'ton'),
                    ('bag',    'bag'),
                    ('pcs',    'pcs'),
                    ('ft',     'ft'),
                    ('m',      'm'),
                    ('m2',     'm2'),
                    ('m3',     'm3'),
                    ('ltr',    'ltr'),
                    ('bundle', 'bundle'),
                    ('box',    'box'),
                    ('roll',   'roll'),
                ],
                default='bag',
            ),
        ),
    ]
