from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0009_remove_floor_project'),
    ]

    operations = [
        migrations.AddField(
            model_name='room',
            name='polygon_points',
            field=models.JSONField(
                null=True, blank=True,
                help_text='Custom polygon as [{x,y},...] in cm. Null = rectangular.'),
        ),
    ]
