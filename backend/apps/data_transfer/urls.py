from django.urls import path
from .views import (
    ProjectListView, ExportProjectView, ExportStatsView,
    ImportSqlView, ExportSystemView, SqlTerminalView,
    ImportProjectDataView,
    # CSV/Excel (Phase 2)
    CsvExportView, CsvTemplateView, CsvDryRunView,
    CsvImportView, ImportJobListView,
)

urlpatterns = [
    # ── Project listing ───────────────────────────────────────────────────────
    path('projects/',                        ProjectListView.as_view(),        name='dt-projects'),

    # ── SQL export ────────────────────────────────────────────────────────────
    path('export/all/',                      ExportSystemView.as_view(),       name='dt-export-all'),
    path('export/<int:project_id>/',         ExportProjectView.as_view(),      name='dt-export'),
    path('export/<int:project_id>/stats/',   ExportStatsView.as_view(),        name='dt-export-stats'),

    # ── SQL import ────────────────────────────────────────────────────────────
    path('import/',                          ImportSqlView.as_view(),          name='dt-import'),
    path('import/project/',                  ImportProjectDataView.as_view(),  name='dt-import-project'),

    # ── SQL terminal ──────────────────────────────────────────────────────────
    path('sql/',                             SqlTerminalView.as_view(),        name='dt-sql-terminal'),

    # ── CSV / Excel (Phase 2) ─────────────────────────────────────────────────
    # GET  ?type=workforce|materials|attendance&fmt=csv|xlsx
    path('csv/export/<int:project_id>/',     CsvExportView.as_view(),          name='dt-csv-export'),
    # GET  ?type=workforce|materials&fmt=csv|xlsx  — blank template with sample row
    path('csv/template/',                    CsvTemplateView.as_view(),        name='dt-csv-template'),
    # POST (multipart: file + type)  — preview without writing
    path('csv/dry-run/<int:project_id>/',    CsvDryRunView.as_view(),          name='dt-csv-dry-run'),
    # POST (multipart: file + type)  — commit import, creates ImportJob
    path('csv/import/<int:project_id>/',     CsvImportView.as_view(),          name='dt-csv-import'),
    # GET  — recent import history
    path('csv/jobs/<int:project_id>/',       ImportJobListView.as_view(),      name='dt-csv-jobs'),
]
