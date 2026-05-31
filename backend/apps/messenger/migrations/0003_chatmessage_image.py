from django.db import migrations, models
import apps.messenger.models


class Migration(migrations.Migration):
    dependencies = [
        ("messenger", "0002_chatpresence"),
    ]

    operations = [
        migrations.AddField(
            model_name="chatmessage",
            name="image",
            field=models.ImageField(blank=True, null=True, upload_to=apps.messenger.models.chat_image_upload_path),
        ),
        migrations.AlterField(
            model_name="chatmessage",
            name="text",
            field=models.TextField(blank=True, default=""),
        ),
    ]
