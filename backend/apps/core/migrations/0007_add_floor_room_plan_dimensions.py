from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0006_add_project_fk_to_phase'),
    ]

    operations = [
        # Floor: exterior building dimensions for the 2D canvas
        migrations.AddField(
            model_name='floor',
            name='plan_width_cm',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Building exterior width in cm'),
        ),
        migrations.AddField(
            model_name='floor',
            name='plan_depth_cm',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Building exterior depth in cm'),
        ),
        # Room: interior dimensions and position for SVG rendering
        migrations.AddField(
            model_name='room',
            name='width_cm',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Room interior width in cm'),
        ),
        migrations.AddField(
            model_name='room',
            name='depth_cm',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Room interior depth in cm'),
        ),
        migrations.AddField(
            model_name='room',
            name='pos_x',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='X position from building left (cm)'),
        ),
        migrations.AddField(
            model_name='room',
            name='pos_y',
            field=models.IntegerField(
                null=True, blank=True,
                help_text='Y position from building top (cm)'),
        ),
    ]
