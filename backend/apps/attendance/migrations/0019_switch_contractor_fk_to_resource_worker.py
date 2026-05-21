# Fixed: PostgreSQL cannot cast bigint → uuid via ALTER COLUMN … USING.
# Strategy: drop old integer FK column, re-add as fresh uuid FK (OneToOne).
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


def _create_partial_unique_index(index_name, table, col):
    def forward(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(
                f'CREATE UNIQUE INDEX IF NOT EXISTS "{index_name}" '
                f'ON "{table}" ("{col}") WHERE "{col}" IS NOT NULL'
            )
    def reverse(apps, schema_editor):
        if schema_editor.connection.vendor == 'sqlite':
            return
        with schema_editor.connection.cursor() as cur:
            cur.execute(f'DROP INDEX IF EXISTS "{index_name}"')
    return forward, reverse


_idx_fwd, _idx_rev = _create_partial_unique_index(
    'attendance_attendanceworker_contractor_id_key',
    'attendance_attendanceworker',
    'contractor_id',
)


class Migration(migrations.Migration):

    dependencies = [
        ('resource', '0005_stockmovement_delivered_by_and_more'),
        ('attendance', '0018_backfill_nfc_uid_updated_at'),
    ]

    operations = [
        migrations.RunPython(_drop_col('attendance_attendanceworker', 'contractor_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('attendance_attendanceworker', 'contractor_id', 'resource_worker'), migrations.RunPython.noop),
        migrations.RunPython(_idx_fwd, _idx_rev),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='attendanceworker',
                    name='contractor',
                    field=models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='attendance_worker',
                        to='resource.worker',
                        help_text='Linked resource worker record for this attendance worker',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
