# Fixed: PostgreSQL cannot cast bigint → uuid via ALTER COLUMN … USING.
# Strategy: truncate stale rows, drop old column, re-add as uuid FK.
# unique_together (supplier, material) index is recreated manually.
#
# SQLite: all raw SQL operations are skipped — delete db.sqlite3 and
# re-run migrate for a clean local dev database.

from django.db import migrations, models
import django.db.models.deletion


def _truncate(table):
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'TRUNCATE TABLE "{table}"')
    return forward


def _drop_col(table, col):
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'ALTER TABLE "{table}" DROP COLUMN IF EXISTS "{col}" CASCADE')
    return forward


def _add_uuid_fk_not_null(table, col, ref_table, on_delete='CASCADE'):
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'''
                ALTER TABLE "{table}"
                    ADD COLUMN "{col}" uuid NOT NULL
                    REFERENCES "{ref_table}" (id)
                    ON DELETE {on_delete}
                    DEFERRABLE INITIALLY DEFERRED
            ''')
    return forward


def _create_unique_index(index_name, table, cols):
    col_list = ', '.join(f'"{c}"' for c in cols)
    def forward(apps, schema_editor):
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'CREATE UNIQUE INDEX IF NOT EXISTS "{index_name}" ON "{table}" ({col_list})')
    def reverse(apps, schema_editor):
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'DROP INDEX IF EXISTS "{index_name}"')
    return forward, reverse


_idx_fwd, _idx_rev = _create_unique_index(
    'analytics_supplierratetrend_supplier_id_material_id_uniq',
    'analytics_supplierratetrend',
    ['supplier_id', 'material_id'],
)


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0005_stockmovement_delivered_by_and_more'),
        ('analytics', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(_truncate('analytics_supplierratetrend'), migrations.RunPython.noop),
        migrations.RunPython(_drop_col('analytics_supplierratetrend', 'material_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk_not_null('analytics_supplierratetrend', 'material_id', 'resource_material'), migrations.RunPython.noop),
        migrations.RunPython(_idx_fwd, _idx_rev),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='supplierratetrend',
                    name='material',
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='rate_trends',
                        to='resource.material',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
