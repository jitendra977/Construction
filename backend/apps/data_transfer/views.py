"""
ConstructPro — Data Transfer API
Export: GET  /api/v1/data-transfer/export/<project_id>/
Import: POST /api/v1/data-transfer/import/
List:   GET  /api/v1/data-transfer/projects/
"""
import re
import logging
from django.http import HttpResponse
from django.db import connection, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework import status

from .exporter import export_project_sql

logger = logging.getLogger(__name__)

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
    """Split SQL into individual statements, ignoring semicolons inside quotes."""
    lines = []
    for line in sql.splitlines():
        stripped = line.strip()
        if stripped.startswith('--') or stripped == '':
            continue
        lines.append(re.sub(r'--.*$', '', line))

    compact = '\n'.join(lines)
    pattern = re.compile(r"((?:'[^']*'|\"[^\"]*\"|`[^`]*`|[^;])*)")
    stmts = [s.strip() for s in pattern.findall(compact) if s.strip()]
    return stmts


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
        if not request.user.is_superuser:
            return Response({'error': 'Superuser access required.'}, status=403)

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


class ImportSqlView(APIView):
    """
    POST /api/v1/data-transfer/import/
    Upload a .sql file and execute it atomically.
    Superusers only.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        if not request.user.is_superuser:
            return Response(
                {'success': False, 'error': 'Superuser access required for SQL import.'},
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
        errors = []
        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    for i, stmt in enumerate(statements):
                        try:
                            cursor.execute(stmt)
                            results.append({
                                'index': i + 1,
                                'status': 'ok',
                                'preview': stmt[:100] + ('...' if len(stmt) > 100 else ''),
                            })
                        except Exception as e:
                            errors.append({'index': i + 1, 'error': str(e), 'statement': stmt[:100]})
                            raise e
        except Exception as e:
            return Response({
                'success': False,
                'statements_executed': len(results),
                'total_statements': len(statements),
                'errors': errors,
                'message': f'Import failed and was fully rolled back. Error: {str(e)}'
            }, status=400)

        return Response({
            'success': True,
            'statements_executed': len(results),
            'total_statements': len(statements),
            'errors': [],
            'preview': [r['preview'] for r in results[:20]],
            'message': f'Successfully imported {len(results)} SQL statement(s).'
        })
