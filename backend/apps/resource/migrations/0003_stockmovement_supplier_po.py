"""
Migration: Add supplier + purchase_order FKs to StockMovement.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("resource", "0002_stockmovement_phase"),
    ]

    operations = [
        migrations.AddField(
            model_name="stockmovement",
            name="supplier",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_movements",
                to="resource.supplier",
            ),
        ),
        migrations.AddField(
            model_name="stockmovement",
            name="purchase_order",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="stock_movements",
                to="resource.purchaseorder",
            ),
        ),
    ]
