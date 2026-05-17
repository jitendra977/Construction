# Fixed: PostgreSQL cannot cast bigint → uuid via ALTER COLUMN … USING.
# Strategy: drop each old integer FK column, re-add as fresh uuid FK.
#
# SQLite: all raw SQL operations are skipped — delete db.sqlite3 and
# re-run migrate for a clean local dev database.

from django.db import migrations, models
import django.db.models.deletion


def _drop_col(table, col):
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "{col}" CASCADE')
    return forward


def _add_uuid_fk(table, col, ref_table, null=True, on_delete='SET NULL'):
    null_kw = 'NULL' if null else 'NOT NULL'
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'''
                ALTER TABLE "{table}"
                    ADD COLUMN "{col}" uuid {null_kw}
                    REFERENCES "{ref_table}" (id)
                    ON DELETE {on_delete}
                    DEFERRABLE INITIALLY DEFERRED
            ''')
    return forward


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0005_stockmovement_delivered_by_and_more'),
        ('finance', '0004_billpayment_signature_data_and_more'),
    ]

    operations = [
        # ── finance_bill.contractor_id ────────────────────────────────────────
        migrations.RunPython(_drop_col('finance_bill', 'contractor_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('finance_bill', 'contractor_id', 'resource_worker'), migrations.RunPython.noop),

        # ── finance_billitem.material_id ──────────────────────────────────────
        migrations.RunPython(_drop_col('finance_billitem', 'material_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('finance_billitem', 'material_id', 'resource_material'), migrations.RunPython.noop),

        # ── finance_purchaseorder.contractor_id ───────────────────────────────
        migrations.RunPython(_drop_col('finance_purchaseorder', 'contractor_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('finance_purchaseorder', 'contractor_id', 'resource_worker'), migrations.RunPython.noop),

        # ── Update Django migration state ─────────────────────────────────────
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='bill',
                    name='contractor',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='finance_bills',
                        to='resource.worker',
                    ),
                ),
                migrations.AlterField(
                    model_name='billitem',
                    name='material',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='finance_bill_items',
                        to='resource.material',
                    ),
                ),
                migrations.AlterField(
                    model_name='purchaseorder',
                    name='contractor',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='finance_purchase_orders',
                        to='resource.worker',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
