# FK state update: accounting.Vendor → fin.Vendor.
# DB: same underlying table (accounting_vendor) — no column changes needed.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0006_vendor_phasebudgetline_budgetrevision'),
        ('analytics', '0002_switch_material_fk_to_resource'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='supplierratetrend',
                    name='supplier',
                    field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='rate_trends', to='financials.vendor'),
                ),
            ],
            database_operations=[],  # same table accounting_vendor — no DB change
        ),
    ]
