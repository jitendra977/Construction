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
    person_toggle_active,
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
    nfc_attendance_scan,
)

# ── MQTT views — imported from their own file for easy maintenance ─────────────
from .mqtt_views import (
    mqtt_config,
    mqtt_test_connection,
    mqtt_status,
    mqtt_scan_logs,
    mqtt_nfc_scan,
    mqtt_devices,
    mqtt_push_users,
    mqtt_push_single_worker,
    mqtt_reboot_device,
    register_nfc_device,
)

router = DefaultRouter()
router.register(r"workers",  AttendanceWorkerViewSet, basename="attendance-worker")
router.register(r"records",  DailyAttendanceViewSet,  basename="attendance-record")

urlpatterns = router.urls + [
    # ── QR scan — AllowAny, used by kiosk/tablet without login ────────────────
    path("qr-scan/",               qr_scan,               name="attendance-qr-scan"),

    # ── Admin: time window config ──────────────────────────────────────────────
    path("time-window/",           time_window,           name="attendance-time-window"),

    # ── NFC attendance scan (legacy HTTP endpoint — kept for backward compat) ─
    path("nfc-attendance/",        nfc_attendance_scan,   name="attendance-nfc-scan"),

    # ── Admin: missed checkouts ────────────────────────────────────────────────
    path("missed-checkouts/",      missed_checkouts,      name="attendance-missed-checkouts"),
    path("manual-checkout/",       manual_checkout,       name="attendance-manual-checkout"),

    # ── Admin: full scan log ───────────────────────────────────────────────────
    path("scan-logs/",             project_scan_logs,     name="attendance-scan-logs"),

    # ── Manpower (legacy — kept for backward compat) ───────────────────────────
    path("unlinked-contractors/",  unlinked_contractors,  name="attendance-unlinked-contractors"),
    path("manpower/",              manpower_overview,     name="attendance-manpower"),

    # ── Unified Person API ─────────────────────────────────────────────────────
    path("persons/",                             persons_list,            name="persons-list"),
    path("persons/add/",                         person_add,              name="person-add"),
    path("persons/adopt-contractor/",            person_adopt_contractor, name="person-adopt-contractor"),
    path("persons/<int:worker_id>/update/",         person_update,           name="person-update"),
    path("persons/<int:worker_id>/toggle-active/",  person_toggle_active,    name="person-toggle-active"),
    path("persons/<int:worker_id>/toggle-role/",    person_toggle_role,      name="person-toggle-role"),

    # ── Dashboard + stats ──────────────────────────────────────────────────────
    path("dashboard/",                     dashboard,    name="attendance-dashboard"),
    path("workers/<int:worker_id>/stats/", worker_stats, name="worker-stats"),

    # ── Project settings ───────────────────────────────────────────────────────
    path("settings/",                      attendance_settings, name="attendance-settings"),

    # ── Holidays ───────────────────────────────────────────────────────────────
    path("holidays/",                       holidays_list,   name="attendance-holidays"),
    path("holidays/<int:holiday_id>/",      holiday_detail,  name="attendance-holiday-detail"),
    path("holidays/<int:holiday_id>/apply/",holiday_apply,   name="attendance-holiday-apply"),

    # ══ MQTT — all broker/NFC config in one place (mqtt_views.py) ═════════════
    # GET/PATCH  ?project=<id>  — read or update broker settings
    path("mqtt/config/",   mqtt_config,          name="mqtt-config"),
    # POST  { project, broker_host?, broker_port? }  — TCP ping test
    path("mqtt/test/",     mqtt_test_connection, name="mqtt-test"),
    # GET   ?project=<id>  — live status + last 10 scan events
    path("mqtt/status/",   mqtt_status,          name="mqtt-status"),
    # GET   ?project=<id>&limit=&offset=  — paginated raw scan log
    path("mqtt/logs/",     mqtt_scan_logs,       name="mqtt-scan-logs"),
    # POST  { nfc_uid, project }  — HTTP fallback / kiosk NFC scan
    path("mqtt/nfc-scan/", mqtt_nfc_scan,        name="mqtt-nfc-scan"),
    # GET   ?project=<id>&mode=&online_minutes=  — NFC device fleet registry
    path("mqtt/devices/",            mqtt_devices,    name="mqtt-devices"),
    # POST  { project, mac? }  — push full worker list to device(s) immediately
    path("mqtt/devices/push-users/", mqtt_push_users, name="mqtt-push-users"),
    # POST  { project, worker_id }  — push a single worker via users/set
    path("mqtt/devices/push-worker/", mqtt_push_single_worker, name="mqtt-push-worker"),
    # POST  { project, mac? }  — reboot one or all devices via nfc/<mac>/cmd
    path("mqtt/devices/reboot/",      mqtt_reboot_device,      name="mqtt-reboot-device"),
    # POST  { project, mac, device_name?, gate_id?, device_mode? }  — manually register a device
    # PATCH { mac, device_name?, gate_id?, device_mode? }            — update existing device
    # DELETE { mac }                                                  — remove device
    path("mqtt/devices/register/",    register_nfc_device,     name="mqtt-register-device"),
]
