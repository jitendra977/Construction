"""
Migration 0011 — App rename: fin → financials

All DB tables keep their `fin_*` names (explicit db_table on every model Meta),
so no schema change is needed.  This migration only does two housekeeping things:

  1. Updates django_migrations rows so Django knows the old fin migrations
     have been applied under the new app label.
  2. Updates django_content_type so the Admin and permissions point to
     the renamed app.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("financials", "0010_fix_table_names"),
    ]

    operations = [
        # Re-point the migration history
        migrations.RunSQL(
            sql="""
                UPDATE django_migrations
                SET    app = 'financials'
                WHERE  app = 'fin';
            """,
            reverse_sql="""
                UPDATE django_migrations
                SET    app = 'fin'
                WHERE  app = 'financials';
            """,
        ),
        # Re-point content types (permissions, admin, GenericForeignKey)
        migrations.RunSQL(
            sql="""
                UPDATE django_content_type
                SET    app_label = 'financials'
                WHERE  app_label = 'fin';
            """,
            reverse_sql="""
                UPDATE django_content_type
                SET    app_label = 'fin'
                WHERE  app_label = 'financials';
            """,
        ),
    ]
