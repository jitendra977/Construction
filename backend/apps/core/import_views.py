"""
SQL Data Import View
Allows superusers to upload a .sql file and execute it against the database.
All statements are wrapped in a single transaction — any error causes full rollback.
Dangerous DDL statements are blocked by a deny-list check before execution.
"""

import re
from django.db import connection, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from rest_framework import status


# Strict blocks for truly dangerous statements
BLOCKED_PATTERNS = [
    r'\bDROP\s+DATABASE\b',
    r'\bDROP\s+TABLE\b',
    r'\bTRUNCATE\s+TABLE\b',
    r'\bTRUNCATE\b',
    r'\bALTER\s+TABLE\s+.*\bDROP\b',  # Block dropping columns/constraints
]


def is_unsafe(sql_content: str) -> list[str]:
    """Return list of matched dangerous patterns found in the SQL content."""
    found = []
    upper = sql_content.upper()
    for pattern in BLOCKED_PATTERNS:
        if re.search(pattern, upper):
            match = re.search(pattern, upper).group(0)
            found.append(match)

    # Check for DELETE without WHERE
    # This is a bit naive but serves as a basic guard
    if re.search(r'\bDELETE\b', upper) and not re.search(r'\bWHERE\b', upper):
        found.append("DELETE without WHERE")

    return found


def split_sql_statements(sql_content: str) -> list[str]:
    """
    Split SQL content by semicolons, ignoring semicolons inside quotes or comments.
    Handles standard SQL dump formatting.
    """
    # 1. Remove standard comments (--)
    lines = []
    for line in sql_content.splitlines():
        if not line.strip().startswith('--'):
            # Keep line but strip trailing comments if any
            clean_line = re.sub(r'--.*$', '', line)
            lines.append(clean_line)
    
    compact_sql = "\n".join(lines)
    
    # 2. Split by semicolon while respecting quotes
    # This is still a heuristic, but much better than a simple split
    # It matches strings '...' or "..." or backticked identifiers `...`
    # and ignores semicolons inside them.
    pattern = re.compile(r"((?:'[^']*'|\"[^\"]*\"|`[^`]*`|[^;])*)")
    segments = pattern.findall(compact_sql)
    
    statements = []
    for seg in segments:
        stmt = seg.strip()
        if stmt:
            # Handle special mysql/phpmyadmin comments like /*!40101 ... */
            # We keep them but they might be skipped by the DB if not MySQL
            statements.append(stmt)
            
    return statements


class SqlImportView(APIView):
    """
    POST /api/v1/import/sql/
    Accepts a multipart form with field 'sql_file' (.sql only).
    Superusers only.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        # --- Superuser guard ---
        if not request.user.is_superuser:
            return Response(
                {'success': False, 'error': 'Admin (superuser) access required.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # --- File validation ---
        sql_file = request.FILES.get('sql_file')
        if not sql_file:
            return Response(
                {'success': False, 'error': 'No file provided. Use field name: sql_file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not sql_file.name.lower().endswith('.sql'):
            return Response(
                {'success': False, 'error': 'Only .sql files are accepted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Read & decode ---
        try:
            sql_content = sql_file.read().decode('utf-8')
        except UnicodeDecodeError:
            try:
                # Fallback to latin-1 if utf-8 fails (common in old dumps)
                sql_content = sql_file.read().decode('latin-1')
            except Exception:
                return Response(
                    {'success': False, 'error': 'File encoding must be UTF-8.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # --- Split into individual statements ---
        statements = split_sql_statements(sql_content)
        if not statements:
            return Response(
                {'success': False, 'error': 'No executable SQL statements found in the file.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Safety check (refined security) ---
        unsafe_matches = []
        for stmt in statements:
            unsafe_matches.extend(is_unsafe(stmt))
        
        if unsafe_matches:
            return Response(
                {
                    'success': False,
                    'error': f'Blocked: file contains dangerous statements: {", ".join(set(unsafe_matches))}. '
                             f'Remove them and try again.'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # --- Execute in a single atomic transaction ---
        results = []
        errors = []

        try:
            with transaction.atomic():
                with connection.cursor() as cursor:
                    for i, stmt in enumerate(statements):
                        try:
                            # Skip MySQL specific comments if they cause issues on other dialects
                            # but usually they are ignored or handled by the driver
                            cursor.execute(stmt)
                            results.append({
                                'index': i + 1,
                                'status': 'ok',
                                'statement': stmt[:120] + ('...' if len(stmt) > 120 else ''),
                            })
                        except Exception as e:
                            errors.append({
                                'index': i + 1,
                                'error': str(e),
                                'statement': stmt[:120] + ('...' if len(stmt) > 120 else ''),
                            })
                            # Re-raise to trigger rollback of the entire transaction
                            raise e

        except Exception as outer_e:
            return Response(
                {
                    'success': False,
                    'statements_executed': len(results),
                    'total_statements': len(statements),
                    'errors': errors,
                    'message': f'Import failed and was fully rolled back. Error: {str(outer_e)}'
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Build preview (first 20 statements summary)
        preview = [r['statement'] for r in results[:20]]

        return Response(
            {
                'success': True,
                'statements_executed': len(results),
                'total_statements': len(statements),
                'errors': [],
                'preview': preview,
                'message': f'Successfully imported {len(results)} SQL statement(s).'
            },
            status=status.HTTP_200_OK
        )
