# Fixed for PostgreSQL: cannot cast bigint → uuid directly.
# Drop the old supplier FK (bigint → resources.Supplier) and
# recreate it as uuid → accounting.Vendor on a fresh database.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0007_merge_suppliers'),
        ('analytics', '0001_initial'),
    ]

    operations = [
        # 1. Drop the unique_together that includes the old supplier field
        migrations.AlterUniqueTogether(
            name='supplierratetrend',
            unique_together=set(),
        ),
        # 2. Remove the old bigint FK to resources.Supplier
        migrations.RemoveField(
            model_name='supplierratetrend',
            name='supplier',
        ),
        # 3. Add the new uuid FK to accounting.Vendor
        migrations.AddField(
            model_name='supplierratetrend',
            name='supplier',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='rate_trends',
                to='accounting.vendor',
            ),
        ),
        # 4. Restore the unique_together with the new supplier field
        migrations.AlterUniqueTogether(
            name='supplierratetrend',
            unique_together={('supplier', 'material')},
        ),
    ]
