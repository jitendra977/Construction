# Fixed: PostgreSQL cannot cast bigint → uuid via ALTER COLUMN … USING.
# Strategy: drop the old integer FK column, add a fresh uuid FK column.
#
# SQLite: these operations are skipped entirely — delete db.sqlite3 and
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
        ('core', '0004_alter_phasedocument_document_type'),
    ]

    operations = [
        migrations.RunPython(_drop_col('core_emaillog', 'material_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('core_emaillog', 'material_id', 'resource_material'), migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='emaillog',
                    name='material',
                    field=models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='email_logs',
                        to='resource.material',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
