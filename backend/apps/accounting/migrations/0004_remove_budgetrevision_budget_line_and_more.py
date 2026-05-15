# Vendor, PhaseBudgetLine, BudgetRevision have moved to the fin app.
# Tables stay in DB (db_table aliases in fin point to the same rows).
# This migration only updates Django's internal model state — no DB changes.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('accounting', '0003_initial'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name='budgetrevision', name='budget_line'),
                migrations.RemoveField(model_name='budgetrevision', name='created_by'),
                migrations.AlterUniqueTogether(name='phasebudgetline', unique_together=None),
                migrations.RemoveField(model_name='phasebudgetline', name='phase'),
                migrations.RemoveField(model_name='phasebudgetline', name='project'),
            ],
            database_operations=[],  # tables owned by fin via db_table alias — do not touch
        ),
    ]
