from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("workforce", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="workforcemember",
            name="portal_pin_hash",
            field=models.CharField(
                blank=True,
                help_text="Hashed PIN used only for Worker Portal login.",
                max_length=128,
            ),
        ),
    ]

