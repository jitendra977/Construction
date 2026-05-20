"""
apps.worker.urls
~~~~~~~~~~~~~~~~
All routes are mounted under /api/v1/worker/ in config/urls.py.

Endpoint summary
----------------
GET  /api/v1/worker/phases/                WorkerPhasesView
GET  /api/v1/worker/tasks/                 WorkerTasksView        (assigned to me)
GET  /api/v1/worker/project-tasks/         WorkerProjectTasksView (all project tasks)
PATCH /api/v1/worker/tasks/<id>/update/    WorkerTaskUpdateView
GET  /api/v1/worker/photos/                WorkerPhotosView
POST /api/v1/worker/photos/upload/         WorkerPhotoUploadView
GET  /api/v1/worker/resources/             WorkerResourcesView
POST /api/v1/worker/material-requests/     WorkerMaterialRequestView
"""
from django.urls import path
from .views import (
    WorkerPhasesView,
    WorkerTasksView,
    WorkerProjectTasksView,
    WorkerTaskUpdateView,
    WorkerPhotosView,
    WorkerPhotoUploadView,
    WorkerResourcesView,
    WorkerMaterialRequestView,
)

urlpatterns = [
    path("phases/",                       WorkerPhasesView.as_view(),         name="worker-phases"),
    path("tasks/",                        WorkerTasksView.as_view(),          name="worker-tasks"),
    path("project-tasks/",               WorkerProjectTasksView.as_view(),    name="worker-project-tasks"),
    path("tasks/<int:pk>/update/",        WorkerTaskUpdateView.as_view(),     name="worker-task-update"),
    path("photos/",                       WorkerPhotosView.as_view(),         name="worker-photos"),
    path("photos/upload/",                WorkerPhotoUploadView.as_view(),    name="worker-photo-upload"),
    path("resources/",                    WorkerResourcesView.as_view(),      name="worker-resources"),
    path("material-requests/",            WorkerMaterialRequestView.as_view(),name="worker-material-request"),
]
