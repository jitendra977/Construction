"""
Data migration: copy apps.finance budget data into apps.financials so the two systems
are unified under apps.financials going forward.

What this does
──────────────
1. For every apps.finance.BudgetCategory, find-or-create an apps.financials.BudgetCategory
   with the same name + project.

2. For every apps.finance.PhaseBudgetAllocation, find-or-create the equivalent
   apps.financials.BudgetAllocation that points to the migrated fin category + same phase.

3. For every apps.finance.Expense that has a legacy `category` (old FK) but
   no `fin_budget_category` yet, stamp the corresponding fin.BudgetCategory.
   This makes BudgetCategory.total_spent / finance_expenses work correctly.

Safe to re-run: all operations are find-or-create / update-if-null.
"""
from django.db import migrations
from decimal import Decimal


def migrate_budget_data(apps, schema_editor):
    OldCat   = apps.get_model("finance",  "BudgetCategory")
    NewCat   = apps.get_model("financials",      "BudgetCategory")
    OldAlloc = apps.get_model("finance",  "PhaseBudgetAllocation")
    NewAlloc = apps.get_model("financials",      "BudgetAllocation")
    Expense  = apps.get_model("finance",  "Expense")

    old_to_new = {}  # old integer id → new UUID id

    # ── Step 1: copy BudgetCategory records ──────────────────────────────────
    for old in OldCat.objects.select_related("project").all():
        new, _ = NewCat.objects.get_or_create(
            project=old.project,
            name=old.name,
            defaults={"description": getattr(old, "description", "") or ""},
        )
        old_to_new[old.pk] = new.pk

    # ── Step 2: copy PhaseBudgetAllocation → BudgetAllocation ────────────────
    for old in OldAlloc.objects.select_related("category", "phase").all():
        new_cat_id = old_to_new.get(old.category_id)
        if not new_cat_id:
            continue
        NewAlloc.objects.get_or_create(
            category_id=new_cat_id,
            phase=old.phase,
            defaults={"allocated_amount": Decimal(str(old.amount or 0))},
        )

    # ── Step 3: stamp fin_budget_category on legacy Expense records ──────────
    for exp in Expense.objects.filter(
        category__isnull=False, fin_budget_category__isnull=True
    ).select_related("category"):
        new_id = old_to_new.get(exp.category_id)
        if new_id:
            exp.fin_budget_category_id = new_id
            exp.save(update_fields=["fin_budget_category"])


def reverse_migration(apps, schema_editor):
    # Un-stamp fin_budget_category on reverse; leave fin records intact.
    Expense = apps.get_model("finance", "Expense")
    Expense.objects.filter(fin_budget_category__isnull=False).update(
        fin_budget_category=None
    )


class Migration(migrations.Migration):

    dependencies = [
        ("financials", "0011_rename_app_label"),
        ("finance", "0008_add_fin_budget_category_to_expense"),
    ]

    operations = [
        migrations.RunPython(migrate_budget_data, reverse_migration),
    ]
