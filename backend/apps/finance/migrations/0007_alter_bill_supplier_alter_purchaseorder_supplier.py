# FK state update: accounting.Vendor → fin.Vendor.
# DB: same underlying table (accounting_vendor) — no column changes needed.

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('financials', '0006_vendor_phasebudgetline_budgetrevision'),
        ('finance', '0006_add_expensedocument_own_model'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='bill',
                    name='supplier',
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='legacy_bills', to='financials.vendor'),
                ),
                migrations.AlterField(
                    model_name='purchaseorder',
                    name='supplier',
                    field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='legacy_purchase_orders', to='financials.vendor'),
                ),
            ],
            database_operations=[],  # same table accounting_vendor — no DB change
        ),
    ]
