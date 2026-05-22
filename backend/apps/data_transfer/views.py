"""
ConstructPro — Data Transfer API
Export: GET  /api/v1/data-transfer/export/<project_id>/
Import: POST /api/v1/data-transfer/import/
List:   GET  /api/v1/data-transfer/projects/

CSV/Excel endpoints (Phase 2):
  GET  csv/export/<project_id>/?type=workforce|materials|attendance&fmt=csv|xlsx
  GET  csv/template/?type=workforce|materials&fmt=csv|xlsx
  POST csv/dry-run/<project_id>/   — preview without writing (multipart: file + type)
  POST csv/import/<project_id>/    — commit import (multipart: file + type)
  GET  csv/jobs/<project_id>/      — list ImportJob history for a project
"""
import re
import logging
from typing import Optional
from django.http import HttpResponse
from django.db import connection, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework import status

from .exporter import export_project_sql

logger = logging.getLogger(__name__)

# Maximum rows returned by the SQL terminal to prevent enormous payloads
SQL_TERMINAL_ROW_LIMIT = 500

BLOCKED_PATTERNS = [
    r'\bDROP\s+DATABASE\b',
    r'\bDROP\s+TABLE\b',
    r'\bTRUNCATE\b',
    r'\bALTER\s+TABLE\s+.*\bDROP\b',
]


def _is_unsafe(sql: str) -> list[str]:
    found = []
    upper = sql.upper()
    for pat in BLOCKED_PATTERNS:
        if re.search(pat, upper):
            found.append(re.search(pat, upper).group(0))
    if re.search(r'\bDELETE\b', upper) and not re.search(r'\bWHERE\b', upper):
        found.append("DELETE without WHERE")
    return found


def _split_statements(sql: str) -> list[str]:
    """
    Split SQL into individual executable statements.
    - Strips comment lines and blank lines.
    - Ignores semicolons inside single-quoted strings.
    - Removes transaction control (BEGIN/COMMIT/ROLLBACK/SAVEPOINT) — the
      importer manages its own transaction so these would break atomicity.
    """
    # Transaction control keywords we must strip out
    TX_CONTROL = re.compile(
        r'^\s*(BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE\s+SAVEPOINT|ROLLBACK\s+TO)\b',
        re.IGNORECASE,
    )

    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith('--'):
            continue
        # Remove inline comments
        lines.append(re.sub(r'--[^\'"]*$', '', line))

    compact = '\n'.join(lines)
    pattern = re.compile(r"((?:'[^']*'|\"[^\"]*\"|`[^`]*`|[^;])*)")
    raw = [s.strip() for s in pattern.findall(compact) if s.strip()]

    # Drop transaction control statements
    stmts = [s for s in raw if not TX_CONTROL.match(s)]
    return stmts


def _normalize_sql_for_connection(sql: str) -> str:
    """
    Make our PostgreSQL-style exports executable on the current database.
    Local development commonly runs SQLite, while production exports include
    PostgreSQL casts like '2026-01-01'::date and ::timestamptz.
    """
    if connection.vendor != 'sqlite':
        return sql

    sql = re.sub(r"'([^']*)'::(?:timestamptz|timestamp|date|time)", r"'\1'", sql, flags=re.IGNORECASE)
    sql = re.sub(r"::(?:timestamptz|timestamp|jsonb?|numeric|decimal|varchar|date|time|uuid|text)", "", sql, flags=re.IGNORECASE)
    return sql


class ProjectListView(APIView):
    """GET /api/v1/data-transfer/projects/ — list all projects for export selector."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.core.models import HouseProject
        from apps.core.mixins import ProjectScopedMixin

        user = request.user
        if getattr(user, 'is_system_admin', False) or user.is_superuser:
            projects = HouseProject.objects.all().order_by('-created_at')
        else:
            from apps.core.models import ProjectMember
            pids = ProjectMember.objects.filter(user=user).values_list('project_id', flat=True)
            projects = HouseProject.objects.filter(id__in=pids).order_by('-created_at')

        data = [
            {
                'id': p.id,
                'name': p.name,
                'owner': p.owner_name,
                'address': p.address,
                'start_date': str(p.start_date),
                'created_at': p.created_at.isoformat(),
            }
            for p in projects
        ]
        return Response({'projects': data, 'count': len(data)})


class ExportProjectView(APIView):
    """GET /api/v1/data-transfer/export/<project_id>/ — download project as SQL."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        user = request.user

        # Permission check — superadmin or project member
        if not (getattr(user, 'is_system_admin', False) or user.is_superuser):
            from apps.core.models import ProjectMember
            if not ProjectMember.objects.filter(user=user, project_id=project_id).exists():
                return Response(
                    {'error': 'You do not have access to this project.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        try:
            sql_content, stats = export_project_sql(project_id)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.exception("Export failed for project %s", project_id)
            return Response({'error': f'Export failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        project_name = stats['project'].replace(' ', '_').lower()
        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"project_{project_id}_{project_name}_{timestamp}.sql"

        response = HttpResponse(sql_content, content_type='application/sql')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['X-Export-Rows'] = stats['total_rows']
        response['X-Export-Tables'] = len(stats['tables'])
        return response


class ExportSystemView(APIView):
    """GET /api/v1/data-transfer/export/all/ — download EVERYTHING as SQL. Superuser only."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _is_admin(request.user):
            return Response({'error': 'Admin access required.'}, status=403)

        try:
            from .exporter import export_all_projects_sql
            sql_content, stats = export_all_projects_sql()
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        from datetime import datetime
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"full_system_backup_{timestamp}.sql"

        response = HttpResponse(sql_content, content_type='application/sql')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class ExportStatsView(APIView):
    """GET /api/v1/data-transfer/export/<project_id>/stats/ — preview what would be exported."""
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        user = request.user
        if not (getattr(user, 'is_system_admin', False) or user.is_superuser):
            from apps.core.models import ProjectMember
            if not ProjectMember.objects.filter(user=user, project_id=project_id).exists():
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            _, stats = export_project_sql(project_id)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(stats)


def _is_admin(user) -> bool:
    """Return True for superusers, staff, and system-admins."""
    return bool(
        getattr(user, 'is_superuser', False)
        or getattr(user, 'is_staff', False)
        or getattr(user, 'is_system_admin', False)
    )


class ImportSqlView(APIView):
    """
    POST /api/v1/data-transfer/import/
    Upload a .sql file and execute it atomically.
    Available to superusers, staff, and system-admins.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if not _is_admin(request.user):
            return Response(
                {'success': False, 'error': 'Admin access required for SQL import.'},
                status=status.HTTP_403_FORBIDDEN
            )

        sql_file = request.FILES.get('sql_file')
        if not sql_file:
            return Response({'success': False, 'error': 'No file. Use field name: sql_file'}, status=400)
        if not sql_file.name.lower().endswith('.sql'):
            return Response({'success': False, 'error': 'Only .sql files accepted.'}, status=400)

        try:
            sql_content = sql_file.read().decode('utf-8')
        except UnicodeDecodeError:
            try:
                sql_file.seek(0)
                sql_content = sql_file.read().decode('latin-1')
            except Exception:
                return Response({'success': False, 'error': 'File must be UTF-8 encoded.'}, status=400)

        sql_content = _normalize_sql_for_connection(sql_content)
        statements = _split_statements(sql_content)
        if not statements:
            return Response({'success': False, 'error': 'No executable SQL statements found.'}, status=400)

        # Safety check
        unsafe = []
        for stmt in statements:
            unsafe.extend(_is_unsafe(stmt))
        if unsafe:
            return Response({
                'success': False,
                'error': f'Blocked: dangerous statements found: {", ".join(set(unsafe))}'
            }, status=400)

        results = []
        skipped = []

        # FK_ERRORS: PostgreSQL error codes for foreign-key violations.
        # These happen when importing old data whose integer IDs no longer
        # exist in UUID-keyed tables.  We skip those rows instead of aborting
        # the entire import so compatible data still gets through.
        FK_ERROR_CODES = {'23503', '23502', '23505', '23000'}

        def _is_fk_error(exc) -> bool:
            code = getattr(getattr(exc, '__cause__', None), 'pgcode', None) \
                   or getattr(exc, 'pgcode', None) \
                   or ''
            return code in FK_ERROR_CODES

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    # NOTE: We do NOT use SET CONSTRAINTS ALL DEFERRED here.
                    # Deferring constraints moves FK checks to commit time, which
                    # is AFTER savepoints are released — meaning violations can no
                    # longer be caught per-statement and the entire transaction
                    # rolls back. Immediate (non-deferred) checks let each
                    # savepoint absorb its own FK/constraint failure gracefully.

                    for i, stmt in enumerate(statements):
                        preview = stmt[:120] + ('…' if len(stmt) > 120 else '')
                        # Each statement runs inside its own savepoint.
                        # Any constraint violation (FK, unique, not-null …) is
                        # caught here, the savepoint is rolled back, and the
                        # statement is recorded as skipped. The outer transaction
                        # and all previously committed savepoints remain intact.
                        try:
                            cursor.execute('SAVEPOINT sp_%d;' % i)
                            cursor.execute(stmt)
                            cursor.execute('RELEASE SAVEPOINT sp_%d;' % i)
                            results.append({'index': i + 1, 'status': 'ok', 'preview': preview})
                        except Exception as exc:
                            # Roll back only this statement's savepoint, then
                            # release it so the savepoint stack stays clean.
                            cursor.execute('ROLLBACK TO SAVEPOINT sp_%d;' % i)
                            cursor.execute('RELEASE SAVEPOINT sp_%d;' % i)
                            err_msg = str(exc).split('\n')[0]  # first line only
                            skipped.append({
                                'index': i + 1,
                                'reason': err_msg,
                                'statement': preview,
                            })
                            logger.warning('Import skipped statement %d: %s', i + 1, err_msg)

        except Exception as exc:
            return Response({
                'success': False,
                'statements_executed': 0,
                'total_statements': len(statements),
                'errors': [{'error': str(exc)}],
                'message': f'Import failed and was fully rolled back. Error: {str(exc)}'
            }, status=400)

        ok_count = len(results)
        sk_count = len(skipped)
        msg = f'Imported {ok_count} of {len(statements)} statement(s).'
        if sk_count:
            msg += (
                f' {sk_count} statement(s) skipped (FK / constraint violations — '
                f'usually old integer IDs that have no matching UUID record).'
            )

        return Response({
            'success': True,
            'statements_executed': ok_count,
            'statements_skipped': sk_count,
            'total_statements': len(statements),
            'skipped': skipped[:20],   # first 20 skipped for UI display
            'preview': [r['preview'] for r in results[:20]],
            'message': msg,
        })


# ── Project-import helpers ────────────────────────────────────────────────────

# Tables whose rows are user-account-specific and should be skipped when
# importing into a different system (users live in accounts_user and may
# have completely different IDs in the target environment).
_USER_SCOPED_TABLES = {
    'accounts_user',
    'accounts_userprofile',
    'auth_user',
    'core_projectmember',      # references user_id → skip if user missing
    'authtoken_token',
    'token_blacklist_outstandingtoken',
    'token_blacklist_blacklistedtoken',
}


def _detect_source_project_id(sql: str) -> Optional[str]:
    """
    Extract the source project's ID from a ConstructPro SQL export header.
    Looks for the comment line:  -- Project ID: <value>
    Returns the value as a string, or None if not found.
    """
    m = re.search(r'--\s*Project\s+ID\s*:\s*(\S+)', sql, re.IGNORECASE)
    return m.group(1).rstrip(',;') if m else None


def _remap_sql(sql_content: str, source_id: str, target_id: str) -> str:
    """
    Replace every quoted occurrence of source_id with target_id throughout
    the SQL text.  Works for both UUID and integer source IDs.
    Handles:  'abc-uuid'  /  '123'  /  plain  123  next to a comma or paren.
    """
    if not source_id or not target_id or source_id == target_id:
        return sql_content

    result = sql_content

    # Quoted string form: 'source_id'
    result = result.replace(f"'{source_id}'", f"'{target_id}'")

    # Bare integer next to SQL syntax boundaries (only when source is numeric)
    if re.match(r'^\d+$', source_id):
        result = re.sub(
            r'(?<=[(\s,])' + re.escape(source_id) + r'(?=[,\s)])',
            f"'{target_id}'",
            result,
        )

    return result


def _stmt_targets_user_table(stmt: str) -> bool:
    """Return True if the statement inserts into an accounts/auth user table."""
    upper = stmt.upper()
    if not re.search(r'\bINSERT\b', upper):
        return False
    for tbl in _USER_SCOPED_TABLES:
        if tbl.upper() in upper:
            return True
    return False


def _run_savepoint_import(cursor, statements):
    """
    Execute each statement inside its own savepoint.
    Returns (results_list, skipped_list).
    """
    results = []
    skipped = []
    for i, stmt in enumerate(statements):
        preview = stmt[:120] + ('…' if len(stmt) > 120 else '')
        try:
            cursor.execute('SAVEPOINT sp_%d;' % i)
            cursor.execute(stmt)
            cursor.execute('RELEASE SAVEPOINT sp_%d;' % i)
            results.append({'index': i + 1, 'status': 'ok', 'preview': preview})
        except Exception as exc:
            cursor.execute('ROLLBACK TO SAVEPOINT sp_%d;' % i)
            cursor.execute('RELEASE SAVEPOINT sp_%d;' % i)
            err_msg = str(exc).split('\n')[0]
            skipped.append({'index': i + 1, 'reason': err_msg, 'statement': preview})
            logger.warning('Import skipped statement %d: %s', i + 1, err_msg)
    return results, skipped


class ImportProjectDataView(APIView):
    """
    POST /api/v1/data-transfer/import/project/

    Smart project-scoped import.
    ─ Accepts: project_id (form field) + sql_file (multipart)
    ─ Detects the source project ID from the SQL header comment.
    ─ Remaps source project ID → target project UUID in every statement.
    ─ Skips accounts_user / core_projectmember rows automatically
      (user IDs differ between systems; their FK violations are expected).
    ─ Imports all other rows with per-savepoint protection so one bad row
      never rolls back the rest.
    ─ Any member of the target project (or admin) can trigger this.
    """
    permission_classes = [IsAuthenticated]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        from apps.core.models import HouseProject, ProjectMember

        user = request.user

        # ── Validate target project ────────────────────────────────────────
        project_id = request.data.get('project_id')
        if not project_id:
            return Response({'success': False, 'error': 'project_id is required.'}, status=400)

        try:
            project = HouseProject.objects.get(pk=project_id)
        except HouseProject.DoesNotExist:
            return Response({'success': False, 'error': 'Project not found.'}, status=404)

        if not _is_admin(user):
            if not ProjectMember.objects.filter(user=user, project_id=project_id).exists():
                return Response({'success': False, 'error': 'You do not have access to this project.'}, status=403)

        # ── Validate file ──────────────────────────────────────────────────
        sql_file = request.FILES.get('sql_file')
        if not sql_file:
            return Response({'success': False, 'error': 'No file. Use field name: sql_file'}, status=400)
        if not sql_file.name.lower().endswith('.sql'):
            return Response({'success': False, 'error': 'Only .sql files are accepted.'}, status=400)

        try:
            sql_content = sql_file.read().decode('utf-8')
        except UnicodeDecodeError:
            sql_file.seek(0)
            try:
                sql_content = sql_file.read().decode('latin-1')
            except Exception:
                return Response({'success': False, 'error': 'File encoding not supported (use UTF-8).'}, status=400)

        # ── Detect & remap project ID ─────────────────────────────────────
        source_project_id = _detect_source_project_id(sql_content)
        target_project_id = str(project.id)

        remapped = False
        if source_project_id and source_project_id != target_project_id:
            sql_content = _remap_sql(sql_content, source_project_id, target_project_id)
            remapped = True

        # ── Split & safety-check ───────────────────────────────────────────
        sql_content = _normalize_sql_for_connection(sql_content)
        statements = _split_statements(sql_content)
        if not statements:
            return Response({'success': False, 'error': 'No executable SQL statements found.'}, status=400)

        unsafe = []
        for stmt in statements:
            unsafe.extend(_is_unsafe(stmt))
        if unsafe:
            return Response({
                'success': False,
                'error': f'Blocked: dangerous statements found: {", ".join(set(unsafe))}'
            }, status=400)

        # ── Separate user-scoped statements from importable ones ───────────
        user_stmts   = [s for s in statements if _stmt_targets_user_table(s)]
        import_stmts = [s for s in statements if not _stmt_targets_user_table(s)]

        # ── Execute importable statements ──────────────────────────────────
        results = []
        skipped = []
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    results, skipped = _run_savepoint_import(cursor, import_stmts)
        except Exception as exc:
            return Response({
                'success': False,
                'statements_executed': 0,
                'total_statements': len(statements),
                'errors': [{'error': str(exc)}],
                'message': f'Import failed and was fully rolled back. Error: {str(exc)}'
            }, status=400)

        ok_count = len(results)
        sk_count = len(skipped)
        total    = len(statements)
        skipped_user = len(user_stmts)

        msg = (
            f'Imported {ok_count} of {total} statement(s) into "{project.name}".'
        )
        if skipped_user:
            msg += f' {skipped_user} user/member row(s) skipped (cross-system user IDs).'
        if sk_count:
            msg += f' {sk_count} other row(s) skipped (constraint violations).'

        return Response({
            'success': True,
            'project': {'id': project.id, 'name': project.name},
            'source_project_id': source_project_id,
            'target_project_id': target_project_id,
            'remapped': remapped,
            'statements_executed': ok_count,
            'statements_skipped': sk_count,
            'statements_skipped_user': skipped_user,
            'total_statements': total,
            'skipped': skipped[:20],
            'preview': [r['preview'] for r in results[:10]],
            'message': msg,
        })


class SqlTerminalView(APIView):
    """
    POST /api/v1/data-transfer/sql/
    Execute a single read-only (or admin-approved) SQL query and return results.
    Superuser / staff / system-admin only.
    Only SELECT statements are allowed; all write/DDL ops are blocked.
    """
    permission_classes = [IsAuthenticated]

    # Patterns that are never allowed in the terminal
    TERMINAL_BLOCKED = re.compile(
        r'\b(DROP|TRUNCATE|ALTER|CREATE|INSERT|UPDATE|DELETE|GRANT|REVOKE'
        r'|COPY|VACUUM|CLUSTER|REINDEX|DISCARD|LOCK|NOTIFY|LISTEN|UNLISTEN'
        r'|LOAD|RESET|SET\s+ROLE|SET\s+SESSION)\b',
        re.IGNORECASE,
    )

    def post(self, request):
        import time

        if not _is_admin(request.user):
            return Response(
                {'success': False, 'error': 'Admin access required for SQL terminal.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        sql = (request.data.get('sql') or '').strip()
        if not sql:
            return Response({'success': False, 'error': 'No SQL provided.'}, status=400)

        # Must start with SELECT (after stripping comments)
        clean = re.sub(r'--[^\n]*', '', sql).strip()
        if not re.match(r'^\s*SELECT\b', clean, re.IGNORECASE):
            return Response(
                {'success': False, 'error': 'Only SELECT statements are allowed in the SQL terminal.'},
                status=400,
            )

        if self.TERMINAL_BLOCKED.search(sql):
            return Response(
                {'success': False, 'error': 'Statement contains a blocked keyword.'},
                status=400,
            )

        # Append a hard row limit so a full-table scan can't kill the server
        limited_sql = f"SELECT * FROM ({clean}) _q LIMIT {SQL_TERMINAL_ROW_LIMIT}"

        t0 = time.time()
        try:
            with connection.cursor() as cursor:
                cursor.execute(limited_sql)
                columns = [col[0] for col in (cursor.description or [])]
                raw_rows = cursor.fetchall()
        except Exception as exc:
            elapsed = round((time.time() - t0) * 1000)
            err_msg = str(exc).split('\n')[0]
            logger.warning('SQL terminal error for user %s: %s', request.user, err_msg)
            return Response(
                {'success': False, 'error': err_msg, 'execution_ms': elapsed},
                status=400,
            )

        elapsed = round((time.time() - t0) * 1000)

        # Serialise every cell to something JSON-safe
        def _safe(v):
            if v is None:
                return None
            if isinstance(v, (int, float, bool, str)):
                return v
            return str(v)

        rows = [[_safe(cell) for cell in row] for row in raw_rows]
        truncated = len(rows) == SQL_TERMINAL_ROW_LIMIT

        return Response({
            'success': True,
            'columns': columns,
            'rows': rows,
            'row_count': len(rows),
            'truncated': truncated,
            'truncated_at': SQL_TERMINAL_ROW_LIMIT if truncated else None,
            'execution_ms': elapsed,
        })


# ══════════════════════════════════════════════════════════════════════════════
# CSV / Excel import-export (Phase 2)
# ══════════════════════════════════════════════════════════════════════════════

class CsvExportView(APIView):
    """
    GET /api/v1/data-transfer/csv/export/<project_id>/
    ?type=workforce|materials|attendance
    &fmt=csv|xlsx
    &date_from=YYYY-MM-DD   (attendance only)
    &date_to=YYYY-MM-DD     (attendance only)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        from apps.core.models import HouseProject, ProjectMember
        from .csv_io import export_workforce, export_materials, export_attendance

        # Permission check
        user = request.user
        if not (_is_admin(user) or ProjectMember.objects.filter(user=user, project_id=project_id).exists()):
            return Response({'error': 'Access denied.'}, status=403)

        import_type = request.query_params.get('type', 'workforce').lower()
        fmt         = request.query_params.get('fmt', 'csv').lower()
        if fmt not in ('csv', 'xlsx'):
            fmt = 'csv'

        try:
            if import_type == 'workforce':
                return export_workforce(project_id, fmt)
            elif import_type == 'materials':
                return export_materials(project_id, fmt)
            elif import_type == 'attendance':
                import datetime
                def _d(val):
                    try:
                        return datetime.date.fromisoformat(val) if val else None
                    except ValueError:
                        return None
                date_from = _d(request.query_params.get('date_from'))
                date_to   = _d(request.query_params.get('date_to'))
                return export_attendance(project_id, date_from, date_to, fmt)
            else:
                return Response({'error': f'Unknown type: {import_type}. Use workforce, materials, or attendance.'}, status=400)
        except Exception as e:
            logger.exception('CSV export failed for project %s type %s', project_id, import_type)
            return Response({'error': str(e)}, status=500)


class CsvTemplateView(APIView):
    """
    GET /api/v1/data-transfer/csv/template/?type=workforce|materials&fmt=csv|xlsx
    Returns a blank template with headers + one sample row.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .csv_io import download_template
        import_type = request.query_params.get('type', 'workforce').lower()
        fmt         = request.query_params.get('fmt', 'csv').lower()
        try:
            return download_template(import_type, fmt)
        except ValueError as e:
            return Response({'error': str(e)}, status=400)


class CsvDryRunView(APIView):
    """
    POST /api/v1/data-transfer/csv/dry-run/<project_id>/
    Body (multipart):  file=<upload>  type=workforce|materials
    Returns preview rows and errors without touching the DB.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser]

    def post(self, request, project_id):
        from apps.core.models import ProjectMember
        from .csv_io import dry_run_workforce, dry_run_materials

        user = request.user
        if not (_is_admin(user) or ProjectMember.objects.filter(user=user, project_id=project_id).exists()):
            return Response({'error': 'Access denied.'}, status=403)

        upload      = request.FILES.get('file')
        import_type = (request.data.get('type') or '').lower()

        if not upload:
            return Response({'error': 'No file. Use field name: file'}, status=400)
        if import_type not in ('workforce', 'materials'):
            return Response({'error': 'type must be workforce or materials'}, status=400)

        try:
            if import_type == 'workforce':
                preview, errors = dry_run_workforce(upload, project_id)
            else:
                preview, errors = dry_run_materials(upload, project_id)
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        new_count    = sum(1 for p in preview if p.get('action') == 'new')
        exists_count = sum(1 for p in preview if p.get('action') == 'exists')
        error_count  = len(errors)

        return Response({
            'preview':       preview[:200],
            'errors':        errors[:50],
            'total_rows':    len(preview),
            'new_rows':      new_count,
            'existing_rows': exists_count,
            'error_rows':    error_count,
            'can_import':    new_count > 0 and error_count == 0,
        })


class CsvImportView(APIView):
    """
    POST /api/v1/data-transfer/csv/import/<project_id>/
    Body (multipart):  file=<upload>  type=workforce|materials
    Commits the import, creates an ImportJob record.
    """
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser]

    def post(self, request, project_id):
        from apps.core.models import HouseProject, ProjectMember
        from .models import ImportJob
        from .csv_io import import_workforce, import_materials

        user = request.user
        if not (_is_admin(user) or ProjectMember.objects.filter(user=user, project_id=project_id).exists()):
            return Response({'error': 'Access denied.'}, status=403)

        try:
            project = HouseProject.objects.get(pk=project_id)
        except HouseProject.DoesNotExist:
            return Response({'error': 'Project not found.'}, status=404)

        upload      = request.FILES.get('file')
        import_type = (request.data.get('type') or '').lower()

        if not upload:
            return Response({'error': 'No file. Use field name: file'}, status=400)
        if import_type not in ('workforce', 'materials'):
            return Response({'error': 'type must be workforce or materials'}, status=400)

        file_name   = getattr(upload, 'name', 'upload')
        file_format = 'xlsx' if file_name.lower().endswith(('.xlsx', '.xls')) else 'csv'

        # Create tracking record
        job = ImportJob.objects.create(
            project       = project,
            created_by    = user,
            import_type   = import_type,
            file_name     = file_name,
            file_format   = file_format,
            status        = 'importing',
        )

        try:
            if import_type == 'workforce':
                imported, skipped, errors = import_workforce(upload, project_id, user, job)
            else:
                imported, skipped, errors = import_materials(upload, project_id, user, job)
        except Exception as e:
            job.mark_failed(str(e))
            logger.exception('CSV import failed for project %s type %s', project_id, import_type)
            return Response({'error': str(e), 'job_id': job.id}, status=500)

        return Response({
            'success':   True,
            'job_id':    job.id,
            'imported':  imported,
            'skipped':   skipped,
            'errors':    errors[:50],
            'message':   f'Imported {imported} {import_type} record(s). {skipped} skipped.',
        })


class ImportJobListView(APIView):
    """
    GET /api/v1/data-transfer/csv/jobs/<project_id>/
    Returns recent ImportJob history for a project.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        from apps.core.models import ProjectMember
        from .models import ImportJob

        user = request.user
        if not (_is_admin(user) or ProjectMember.objects.filter(user=user, project_id=project_id).exists()):
            return Response({'error': 'Access denied.'}, status=403)

        jobs = ImportJob.objects.filter(project_id=project_id).select_related('created_by')[:50]
        data = [
            {
                'id':            j.id,
                'import_type':   j.import_type,
                'file_name':     j.file_name,
                'file_format':   j.file_format,
                'status':        j.status,
                'rows_total':    j.rows_total,
                'rows_imported': j.rows_imported,
                'rows_skipped':  j.rows_skipped,
                'rows_failed':   j.rows_failed,
                'created_by':    j.created_by.get_full_name() if j.created_by else '—',
                'created_at':    j.created_at,
                'completed_at':  j.completed_at,
            }
            for j in jobs
        ]
        return Response({'jobs': data, 'count': len(data)})
