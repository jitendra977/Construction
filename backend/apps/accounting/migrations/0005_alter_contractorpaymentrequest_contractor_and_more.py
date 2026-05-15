# State: update FK references from accounting.Vendor → fin.Vendor, then delete the models.
# DB: AlterField FKs are no-ops (same underlying table accounting_vendor).
#     DeleteModel is a no-op (tables kept by fin via db_table alias).

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0004_remove_budgetrevision_budget_line_and_more'),
        ('resources', '0002_alter_material_supplier_and_more'),
        ('fin', '0006_vendor_phasebudgetline_budgetrevision'),
        ('analytics', '0003_alter_supplierratetrend_supplier'),
        ('finance', '0007_alter_bill_supplier_alter_purchaseorder_supplier'),
    ]

    operations = [
        # Update FK state references: accounting.Vendor → fin.Vendor (same DB column/table)
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='contractorpaymentrequest',
                    name='contractor',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='payment_requests',
                        to='fin.vendor',
                    ),
                ),
                migrations.AlterField(
                    model_name='purchaseorder',
                    name='vendor',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='purchase_orders',
                        to='fin.vendor',
                    ),
                ),
                migrations.AlterField(
                    model_name='vendorbill',
                    name='vendor',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name='bills',
                        to='fin.vendor',
                    ),
                ),
                migrations.DeleteModel(name='BudgetRevision'),
                migrations.DeleteModel(name='PhaseBudgetLine'),
                migrations.DeleteModel(name='Vendor'),
            ],
            database_operations=[],  # all no-ops: same table, same columns, tables not dropped
        ),
    ]
