from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    AttendanceWorkerViewSet,
    DailyAttendanceViewSet,
    qr_scan,
    time_window,
    missed_checkouts,
    manual_checkout,
    project_scan_logs,
    unlinked_contractors,
    manpower_overview,
    # Unified person API
    persons_list,
    person_add,
    person_update,
    person_toggle_role,
    person_adopt_contractor,
    # Dashboard + stats
    dashboard,
    worker_stats,
    # Settings + Holidays
    attendance_settings,
    holidays_list,
    holiday_detail,
    holiday_apply,
)

router = DefaultRouter()
router.register(r"workers",  AttendanceWorkerViewSet, basename="attendance-worker")
router.register(r"records",  DailyAttendanceViewSet,  basename="attendance-record")

urlpatterns = router.urls + [
    # QR scan — AllowAny, used by kiosk/tablet without user login
    path("qr-scan/",               qr_scan,               name="attendance-qr-scan"),
    # Admin: time window config
    path("time-window/",           time_window,           name="attendance-time-window"),
    # Admin: missed checkouts list
    path("missed-checkouts/",      missed_checkouts,      name="attendance-missed-checkouts"),
    # Admin: manual checkout correction
    path("manual-checkout/",       manual_checkout,       name="attendance-manual-checkout"),
    # Admin: full scan log for project
    path("scan-logs/",             project_scan_logs,     name="attendance-scan-logs"),
    # Manpower (legacy — kept for backward compat)
    path("unlinked-contractors/",  unlinked_contractors,  name="attendance-unlinked-contractors"),
    path("manpower/",              manpower_overview,     name="attendance-manpower"),
    # ── Unified Person API ─────────────────────────────────────────────────────
    path("persons/",                           persons_list,           name="persons-list"),
    path("persons/add/",                       person_add,             name="person-add"),
    path("persons/adopt-contractor/",          person_adopt_contractor,name="person-adopt-contractor"),
    path("persons/<int:worker_id>/update/",    person_update,          name="person-update"),
    path("persons/<int:worker_id>/toggle-role/", person_toggle_role,   name="person-toggle-role"),
    # Dashboard + stats
    path("dashboard/",                           dashboard,             name="attendance-dashboard"),
    path("workers/<int:worker_id>/stats/",       worker_stats,          name="worker-stats"),
    # Project settings
    path("settings/",                            attendance_settings,   name="attendance-settings"),
    # Holidays
    path("holidays/",                            holidays_list,         name="attendance-holidays"),
    path("holidays/<int:holiday_id>/",           holiday_detail,        name="attendance-holiday-detail"),
    path("holidays/<int:holiday_id>/apply/",     holiday_apply,         name="attendance-holiday-apply"),
]
