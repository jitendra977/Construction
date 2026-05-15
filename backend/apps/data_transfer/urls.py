from django.urls import path
from .views import (
    ProjectListView, ExportProjectView, ExportStatsView,
    ImportSqlView, ExportSystemView, SqlTerminalView,
    ImportProjectDataView,
)

urlpatterns = [
    path('projects/',                        ProjectListView.as_view(),        name='dt-projects'),
    path('export/all/',                      ExportSystemView.as_view(),       name='dt-export-all'),
    path('export/<int:project_id>/',         ExportProjectView.as_view(),      name='dt-export'),
    path('export/<int:project_id>/stats/',   ExportStatsView.as_view(),        name='dt-export-stats'),
    path('import/',                          ImportSqlView.as_view(),          name='dt-import'),
    path('import/project/',                  ImportProjectDataView.as_view(),  name='dt-import-project'),
    path('sql/',                             SqlTerminalView.as_view(),        name='dt-sql-terminal'),
]
