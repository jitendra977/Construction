import os
filepath = '/Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/backend/apps/financials/migrations/0011_rename_app_label.py'
with open(filepath, 'r') as f:
    content = f.read()
content = content.replace("'0010_migrate_finance_budget_data'", "'0010_fix_table_names'")
with open(filepath, 'w') as f:
    f.write(content)
