from django.urls import path
from .views import ProjectListView, ExportProjectView, ExportStatsView, ImportSqlView

urlpatterns = [
    path('projects/',                        ProjectListView.as_view(),   name='dt-projects'),
    path('export/<int:project_id>/',         ExportProjectView.as_view(), name='dt-export'),
    path('export/<int:project_id>/stats/',   ExportStatsView.as_view(),   name='dt-export-stats'),
    path('import/',                          ImportSqlView.as_view(),     name='dt-import'),
]
