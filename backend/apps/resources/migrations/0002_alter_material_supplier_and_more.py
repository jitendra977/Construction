# FK state update: accounting.Vendor → fin.Vendor.
# DB: same underlying table (accounting_vendor) — no column changes needed.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('fin', '0006_vendor_phasebudgetline_budgetrevision'),
        ('resources', '0001_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='material',
                    name='supplier',
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='materials', to='fin.vendor'),
                ),
                migrations.AlterField(
                    model_name='materialtransaction',
                    name='supplier',
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='material_transactions', to='fin.vendor'),
                ),
            ],
            database_operations=[],  # same table accounting_vendor — no DB change
        ),
    ]
