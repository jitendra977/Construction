from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('resources', '0008_material_total_wasted_wastagethreshold_wastagealert'),
    ]

    operations = [
        migrations.AddField(
            model_name='materialtransaction',
            name='receipt_image',
            field=models.ImageField(
                blank=True,
                help_text='Photo of challan/bill for this stock entry',
                null=True,
                upload_to='stock-receipts/',
            ),
        ),
    ]
