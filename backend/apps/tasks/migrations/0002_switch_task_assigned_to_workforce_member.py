# Fixed: PostgreSQL cannot cast bigint → uuid via ALTER COLUMN … USING.
# Strategy: drop old integer FK column, re-add as fresh uuid FK.
#
# SQLite: all raw SQL operations are skipped — delete db.sqlite3 and
# re-run migrate for a clean local dev database.

import django.db.models.deletion
from django.db import migrations, models


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
        ('tasks', '0001_initial'),
        ('workforce', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(_drop_col('tasks_task', 'assigned_to_id'), migrations.RunPython.noop),
        migrations.RunPython(_add_uuid_fk('tasks_task', 'assigned_to_id', 'workforce_workforcemember'), migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='task',
                    name='assigned_to',
                    field=models.ForeignKey(
                        blank=True, null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='tasks',
                        to='workforce.workforcemember',
                    ),
                ),
            ],
            database_operations=[],
        ),
    ]
