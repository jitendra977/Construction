"""
ConstructPro — Project SQL Exporter
Generates a portable PostgreSQL SQL dump for a single project.
The dump can be re-imported on any ConstructPro instance.
"""
import uuid
import datetime
import decimal
import json
from django.db import connection


# ── Ordered export plan ───────────────────────────────────────
# Each entry: (app_label, model_name, filter_kwargs_factory(project_id))
# filter_kwargs_factory receives the project_id and returns ORM filter kwargs.

def _project_filter(pid):
    return {'project_id': pid}

def _phase_filter(pid):
    return {'phase__project_id': pid}

def _task_filter(pid):
    return {'task__phase__project_id': pid}

def _material_filter(pid):
    return {'material__project_id': pid}

def _funding_filter(pid):
    return {'funding_source__project_id': pid}

def _bill_filter(pid):
    return {'bill__project_id': pid}

def _category_filter(pid):
    return {'category__project_id': pid}


EXPORT_PLAN = [
    # Core
    ('core',      'HouseProject',          lambda pid: {'id': pid}),
    ('core',      'ConstructionPhase',      _project_filter),
    ('core',      'Floor',                  _project_filter),
    ('core',      'Room',                   lambda pid: {'floor__project_id': pid}),
    ('core',      'ProjectMember',          _project_filter),

    # Tasks
    ('tasks',     'Task',                   _phase_filter),
    ('tasks',     'TaskMedia',              _task_filter),
    ('tasks',     'TaskUpdate',             _task_filter),

    # Finance
    ('finance',   'BudgetCategory',         _project_filter),
    ('finance',   'PhaseBudgetAllocation',  _phase_filter),
    ('finance',   'FundingSource',          _project_filter),
    ('finance',   'FundingTransaction',     _funding_filter),
    ('finance',   'Account',                _project_filter),
    ('finance',   'JournalEntry',           _project_filter),
    ('finance',   'JournalLine',            lambda pid: {'entry__project_id': pid}),
    ('finance',   'PurchaseOrder',          _project_filter),
    ('finance',   'Bill',                   _project_filter),
    ('finance',   'BillItem',               _bill_filter),
    ('finance',   'BillPayment',            _project_filter),
    ('finance',   'BankTransfer',           _project_filter),
    ('finance',   'Expense',                _project_filter),
    ('finance',   'Payment',                _project_filter),

    # Resources
    ('resources', 'Contractor',             _project_filter),
    ('resources', 'Material',               _project_filter),
    ('resources', 'MaterialTransaction',    _material_filter),
    ('resources', 'Document',               _project_filter),
    ('resources', 'WastageThreshold',       _material_filter),
    ('resources', 'WastageAlert',           _material_filter),

    # Permits
    ('permits',   'PermitStep',             _project_filter),

    # Analytics
    ('analytics', 'BudgetForecast',         _category_filter),
    ('analytics', 'SupplierRateTrend',      _material_filter),
]


# ── Value serializer ──────────────────────────────────────────

def _pg_literal(value):
    """Convert a Python value to a PostgreSQL literal string."""
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, decimal.Decimal):
        return str(value)
    if isinstance(value, datetime.datetime):
        return f"'{value.isoformat()}'::timestamptz"
    if isinstance(value, datetime.date):
        return f"'{value.isoformat()}'::date"
    if isinstance(value, datetime.time):
        return f"'{value.isoformat()}'::time"
    if isinstance(value, uuid.UUID):
        return f"'{value}'"
    if isinstance(value, (dict, list)):
        escaped = json.dumps(value).replace("'", "''")
        return f"'{escaped}'"
    if isinstance(value, memoryview):
        return f"'\\x{value.hex()}'"
    # Default: string — escape single quotes
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def _get_table_name(app_label, model_name):
    """Return the actual DB table name for a model."""
    from django.apps import apps
    model = apps.get_model(app_label, model_name)
    return model._meta.db_table


def _rows_to_sql(app_label, model_name, filter_kwargs):
    """
    Query rows matching filter_kwargs and return a list of INSERT SQL strings.
    Returns (table_name, count, sql_lines).
    """
    from django.apps import apps
    try:
        model = apps.get_model(app_label, model_name)
    except LookupError:
        return model_name, 0, []

    try:
        qs = model.objects.filter(**filter_kwargs).values()
    except Exception:
        return model._meta.db_table, 0, []

    rows = list(qs)
    if not rows:
        return model._meta.db_table, 0, []

    table = model._meta.db_table
    columns = list(rows[0].keys())
    col_list = ', '.join(f'"{c}"' for c in columns)

    lines = []
    for row in rows:
        values = ', '.join(_pg_literal(row[c]) for c in columns)
        lines.append(
            f"INSERT INTO \"{table}\" ({col_list}) VALUES ({values}) "
            f"ON CONFLICT DO NOTHING;"
        )

    return table, len(rows), lines


# ── Main export function ──────────────────────────────────────

def export_project_sql(project_id: int) -> tuple[str, dict]:
    """
    Generate a complete SQL dump for the given project.
    Returns (sql_string, stats_dict).
    """
    from django.apps import apps

    # Validate project exists
    try:
        project = apps.get_model('core', 'HouseProject').objects.get(pk=project_id)
    except Exception:
        raise ValueError(f"Project with id={project_id} not found.")

    now = datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')
    lines = [
        f"-- ============================================================",
        f"-- ConstructPro SQL Export",
        f"-- Project  : {project.name}",
        f"-- Project ID: {project_id}",
        f"-- Exported : {now}",
        f"-- ============================================================",
        f"-- Re-import with:  POST /api/v1/data-transfer/import/",
        f"-- Conflicts are silently skipped (ON CONFLICT DO NOTHING).",
        f"-- ============================================================",
        f"",
        f"BEGIN;",
        f"",
    ]

    stats = {'project': project.name, 'tables': [], 'total_rows': 0}

    for app_label, model_name, filter_factory in EXPORT_PLAN:
        try:
            filter_kwargs = filter_factory(project_id)
            table, count, sql_lines = _rows_to_sql(app_label, model_name, filter_kwargs)
        except Exception as e:
            lines.append(f"-- SKIPPED {model_name}: {e}")
            continue

        lines.append(f"-- ── {app_label}.{model_name} ({count} rows) ──")
        if sql_lines:
            lines.extend(sql_lines)
        lines.append("")

        stats['tables'].append({'model': f"{app_label}.{model_name}", 'table': table, 'rows': count})
        stats['total_rows'] += count

    lines.append("COMMIT;")
    lines.append("")
    lines.append(f"-- Export complete: {stats['total_rows']} total rows")

    return '\n'.join(lines), stats
