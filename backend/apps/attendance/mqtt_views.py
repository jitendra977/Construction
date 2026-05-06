"""
MQTT Attendance — API Views
════════════════════════════
All MQTT-related HTTP endpoints live here, separate from the main views.py.
Import these into urls.py under the  attendance/mqtt/  prefix.

Why separate?
  • views.py is already large (QR scan, daily sheet, payroll, persons API …).
  • MQTT config & status have a completely different concern and change cadence.
  • Keeping them here makes it easy to update broker logic without touching
    attendance business logic.

Endpoints exposed (all under /api/v1/attendance/mqtt/):
  GET/PATCH  config/      — read or update MQTTConfig for a project
  POST       test/         — TCP ping to broker (test before saving)
  GET        status/       — live connection state + last 10 scan events
  GET        logs/         — paginated MQTTScanEvent log
  POST       nfc-scan/     — HTTP fallback NFC scan (mirrors MQTT listener path)
"""

import json
import logging
import socket

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.attendance.models import AttendanceWorker
from apps.attendance.mqtt_models import MQTTConfig, MQTTScanEvent, NFCDevice

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# Internal helpers
# ══════════════════════════════════════════════════════════════════════════════

def _get_or_create_config(project_id):
    """
    Return (MQTTConfig, created) for the given project_id.

    On first creation, pre-populates broker settings from ProjectAttendanceSettings
    (the legacy MQTT fields) so existing setups don't need to re-enter their config.

    Raises core.HouseProject.DoesNotExist if the project doesn't exist.
    """
    from apps.core.models import HouseProject
    project = HouseProject.objects.get(pk=project_id)
    cfg, created = MQTTConfig.objects.get_or_create(project=project)

    if created:
        # Migrate settings from the legacy ProjectAttendanceSettings model
        try:
            from apps.attendance.models import ProjectAttendanceSettings
            legacy = ProjectAttendanceSettings.objects.get(project=project)
            if legacy.mqtt_broker_url:
                cfg.broker_host = legacy.mqtt_broker_url
            if legacy.mqtt_port:
                cfg.broker_port = legacy.mqtt_port
            if legacy.mqtt_topic:
                cfg.topic = legacy.mqtt_topic
            if legacy.mqtt_username:
                cfg.username = legacy.mqtt_username
            if legacy.mqtt_password:
                cfg.password = legacy.mqtt_password
            cfg.save()
            logger.info(
                "MQTTConfig for project %s auto-populated from ProjectAttendanceSettings",
                project_id,
            )
        except Exception:
            pass   # No legacy settings — keep defaults

    return cfg, created


def _config_to_dict(cfg: MQTTConfig) -> dict:
    """Serialise MQTTConfig to a safe dict (password is never returned)."""
    return {
        "id":                 cfg.pk,
        "project":            cfg.project_id,
        "broker_host":        cfg.broker_host,
        "broker_port":        cfg.broker_port,
        "ws_port":            cfg.ws_port,
        "topic":              cfg.topic,
        "username":           cfg.username,
        # Never return the raw password — just signal whether one is set
        "has_password":       bool(cfg.password),
        "use_tls":            cfg.use_tls,
        "is_enabled":         cfg.is_enabled,
        "connection_status":  cfg.connection_status,
        "last_connected_at":  cfg.last_connected_at,
        "last_error_message": cfg.last_error_message,
        "listener_pid":       cfg.listener_pid,
        "updated_at":         cfg.updated_at,
    }


def _event_to_dict(evt: MQTTScanEvent) -> dict:
    """Serialise MQTTScanEvent to a dict for list responses (includes v2 telemetry)."""
    return {
        "id":               evt.pk,
        "topic":            evt.topic,
        "nfc_uid":          evt.nfc_uid,
        "event_type":       evt.event_type,
        "message":          evt.message,
        "worker_name":      evt.worker_name,
        "received_at":      evt.received_at,
        # v2.1 offline-queue fields
        "is_queued":        evt.is_queued,
        "device_timestamp": evt.device_timestamp,
        # Effective scan time: use device_timestamp when queued, else received_at
        "scan_time":        evt.device_timestamp if evt.is_queued and evt.device_timestamp else evt.received_at,
        # v2 device telemetry (blank/null for older firmware)
        "firmware_version": evt.firmware_version,
        "device_mode":      evt.device_mode,
        "gate_id":          evt.gate_id,
        "device_uptime_ms": evt.device_uptime_ms,
        "device_rssi":      evt.device_rssi,
        "device_free_heap": evt.device_free_heap,
        "device_scan_no":   evt.device_scan_no,
    }


def _device_to_dict(dev: NFCDevice) -> dict:
    """Serialise NFCDevice to a dict for the fleet endpoint."""
    return {
        "id":               dev.pk,
        "mac":              dev.mac,
        "device_name":      dev.device_name,
        "project":          dev.project_id,
        "gate_id":          dev.gate_id,
        "device_mode":      dev.device_mode,
        "firmware_version": dev.firmware_version,
        "ip_address":       dev.ip_address,
        "total_scans":      dev.total_scans,
        "first_seen":       dev.first_seen,
        "last_seen":        dev.last_seen,
    }


def _log_scan_event(cfg: MQTTConfig, *, topic: str, raw_payload: str,
                    nfc_uid: str, event_type: str, message: str,
                    worker_name: str = "") -> MQTTScanEvent:
    """
    Persist an MQTTScanEvent.  Called by both the HTTP fallback view and the
    MQTT listener to keep the log consistent regardless of how the scan arrived.
    """
    return MQTTScanEvent.objects.create(
        config=cfg,
        topic=topic,
        raw_payload=raw_payload,
        nfc_uid=nfc_uid,
        event_type=event_type,
        message=message,
        worker_name=worker_name,
    )


# ══════════════════════════════════════════════════════════════════════════════
# Views
# ══════════════════════════════════════════════════════════════════════════════

@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated])
def mqtt_config(request):
    """
    GET  ?project=<id>  — Return MQTTConfig for the project (auto-created with
                          defaults if this is the first access).
    PATCH               — Update broker settings.  Password is only overwritten
                          when the caller sends a non-empty "password" field;
                          omitting the key leaves the stored password unchanged.

    Request body (PATCH):
      {
        "project":     123,
        "broker_host": "192.168.1.100",
        "broker_port": 1883,
        "ws_port":     9001,
        "topic":       "nfc/+/state",
        "username":    "mqttuser",
        "password":    "s3cr3t",   // omit to leave unchanged
        "use_tls":     false,
        "is_enabled":  true
      }
    """
    project_id = request.query_params.get("project") or request.data.get("project")
    if not project_id:
        return Response({"error": "project query parameter is required"}, status=400)

    try:
        cfg, _ = _get_or_create_config(project_id)
    except Exception as e:
        return Response({"error": str(e)}, status=404)

    if request.method == "GET":
        return Response(_config_to_dict(cfg))

    # ── PATCH ─────────────────────────────────────────────────────────────────
    WRITABLE_FIELDS = [
        "broker_host", "broker_port", "ws_port",
        "topic", "username", "use_tls", "is_enabled",
    ]
    for field in WRITABLE_FIELDS:
        if field in request.data:
            setattr(cfg, field, request.data[field])

    # Password handled separately — only update when caller sends a value
    new_password = request.data.get("password", "")
    if new_password:
        cfg.password = new_password

    cfg.save()
    logger.info("MQTTConfig updated for project %s by user %s", project_id, request.user)
    return Response(_config_to_dict(cfg))


# ──────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mqtt_test_connection(request):
    """
    POST { project, broker_host?, broker_port? }

    Opens a TCP socket to the broker and measures latency.
    Accepts optional override host/port so you can test before saving.

    Response:
      { success: true,  message: "Connected to 192.168.1.100:1883", latency_ms: 4 }
      { success: false, message: "Cannot reach …: Connection refused" }
    """
    project_id = request.data.get("project")
    if not project_id:
        return Response({"error": "project is required"}, status=400)

    try:
        cfg, _ = _get_or_create_config(project_id)
    except Exception as e:
        return Response({"error": str(e)}, status=404)

    # Allow caller to test a host/port before saving it
    host = request.data.get("broker_host", cfg.broker_host) or cfg.broker_host
    port = int(request.data.get("broker_port", cfg.broker_port) or cfg.broker_port)

    t_start = timezone.now()
    try:
        with socket.create_connection((host, port), timeout=5):
            pass
        latency_ms = int((timezone.now() - t_start).total_seconds() * 1000)
        return Response({
            "success":    True,
            "message":    f"Connected to {host}:{port}",
            "latency_ms": latency_ms,
        })
    except socket.timeout:
        return Response({
            "success": False,
            "message": f"Timed out connecting to {host}:{port} (5 s)",
        })
    except (ConnectionRefusedError, OSError) as exc:
        return Response({
            "success": False,
            "message": f"Cannot reach {host}:{port} — {exc}",
        })


# ──────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mqtt_status(request):
    """
    GET ?project=<id>

    Returns the live connection state of the MQTT listener plus the 10 most
    recent scan events.  Designed for a small dashboard status widget that
    polls every 5-10 seconds.

    Response:
      {
        "config":        { …MQTTConfig fields… },
        "recent_events": [ …last 10 MQTTScanEvent… ]
      }
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project query parameter is required"}, status=400)

    try:
        cfg, _ = _get_or_create_config(project_id)
    except Exception as e:
        return Response({"error": str(e)}, status=404)

    recent_events = cfg.scan_events.all()[:10]
    return Response({
        "config":        _config_to_dict(cfg),
        "recent_events": [_event_to_dict(e) for e in recent_events],
    })


# ──────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mqtt_scan_logs(request):
    """
    GET ?project=<id>&limit=50&offset=0&uid=<filter>

    Paginated list of raw MQTT scan events for the admin log viewer.
    Optional ?uid= filter to show events for a specific NFC card.

    Response:
      {
        "total":   412,
        "limit":   50,
        "offset":  0,
        "results": [ …MQTTScanEvent… ]
      }
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project query parameter is required"}, status=400)

    limit  = min(int(request.query_params.get("limit",  50)), 200)
    offset = int(request.query_params.get("offset", 0))
    uid_filter = request.query_params.get("uid", "").strip().upper()

    try:
        cfg, _ = _get_or_create_config(project_id)
    except Exception as e:
        return Response({"error": str(e)}, status=404)

    qs = cfg.scan_events.all()
    if uid_filter:
        qs = qs.filter(nfc_uid__icontains=uid_filter)

    total  = qs.count()
    events = qs[offset: offset + limit]

    return Response({
        "total":   total,
        "limit":   limit,
        "offset":  offset,
        "results": [_event_to_dict(e) for e in events],
    })


# ──────────────────────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mqtt_nfc_scan(request):
    """
    POST { nfc_uid, project }

    HTTP fallback for NFC scans.
    Runs the same attendance logic as the MQTT listener but via REST — useful
    for kiosks that communicate directly with the backend instead of through
    a broker, or for manual testing from Swagger / Postman.

    The scan event is also written to MQTTScanEvent so the log stays consistent
    regardless of how the scan arrived.

    Response mirrors _process_attendance_scan:
      { success, message, action, worker, attendance }
    """
    from apps.attendance.views import _process_attendance_scan

    nfc_uid    = (request.data.get("nfc_uid", "") or "").replace(" ", "").upper()
    project_id = request.data.get("project")

    if not nfc_uid:
        return Response({"success": False, "message": "nfc_uid is required"}, status=400)

    # ── Resolve worker ────────────────────────────────────────────────────────
    qs = AttendanceWorker.objects.select_related("project").filter(
        nfc_uid__iexact=nfc_uid,
        is_active=True,
    )
    if project_id:
        qs = qs.filter(project_id=project_id)

    worker = qs.first()

    # ── Get (or create) MQTTConfig for logging ────────────────────────────────
    cfg = None
    if project_id:
        try:
            cfg, _ = _get_or_create_config(project_id)
        except Exception:
            pass
    elif worker:
        try:
            cfg, _ = _get_or_create_config(worker.project_id)
        except Exception:
            pass

    # ── Worker not found ──────────────────────────────────────────────────────
    if not worker:
        msg = f"No active worker found for NFC UID: {nfc_uid}"
        if cfg:
            _log_scan_event(
                cfg,
                topic="http/nfc-scan",
                raw_payload=json.dumps(request.data),
                nfc_uid=nfc_uid,
                event_type="unknown",
                message=msg,
            )
        return Response({"success": False, "message": msg}, status=404)

    # ── Process attendance ────────────────────────────────────────────────────
    result = _process_attendance_scan(worker, request=request, scan_source="HTTP-NFC")

    # ── Log to MQTTScanEvent ──────────────────────────────────────────────────
    if cfg:
        event_type = "success" if result.get("success") else "rejected"
        _log_scan_event(
            cfg,
            topic="http/nfc-scan",
            raw_payload=json.dumps(request.data),
            nfc_uid=nfc_uid,
            event_type=event_type,
            message=result.get("message", ""),
            worker_name=worker.name,
        )

    status_code = 200 if result.get("success") else 422
    return Response(result, status=status_code)


# ──────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mqtt_devices(request):
    """
    GET ?project=<id>

    Returns the NFC device fleet for a project, populated from nfc/announce
    heartbeats received by the MQTT listener.

    Optional filters:
      ?mode=door_lock|attendance|hybrid   filter by device mode
      ?online_minutes=10                  only devices seen in last N minutes

    Response:
      {
        "total": 3,
        "devices": [
          {
            "id": 1,
            "mac": "AA:BB:CC:DD:EE:FF",
            "device_name": "Site A Gate",
            "project": 1,
            "gate_id": "main_gate",
            "device_mode": "hybrid",
            "firmware_version": "2.1.0",
            "ip_address": "192.168.1.50",
            "total_scans": 142,
            "first_seen": "...",
            "last_seen": "..."
          },
          …
        ]
      }
    """
    project_id = request.query_params.get("project")
    if not project_id:
        return Response({"error": "project query parameter is required"}, status=400)

    qs = NFCDevice.objects.filter(project_id=project_id)

    # Optional mode filter
    mode = request.query_params.get("mode", "").strip()
    if mode:
        qs = qs.filter(device_mode=mode)

    # Optional "online in last N minutes" filter
    online_minutes = request.query_params.get("online_minutes", "").strip()
    if online_minutes:
        try:
            from django.utils import timezone
            import datetime
            cutoff = timezone.now() - datetime.timedelta(minutes=int(online_minutes))
            qs = qs.filter(last_seen__gte=cutoff)
        except (ValueError, TypeError):
            pass

    devices = list(qs)
    return Response({
        "total":   len(devices),
        "devices": [_device_to_dict(d) for d in devices],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mqtt_push_users(request):
    """
    POST { project, mac? }

    Immediately publishes the full active worker list for a project to one or
    all NFC devices as  nfc/<mac>/users/sync  so the device's local user table
    is refreshed without waiting for the next MQTT reconnect.

    Body:
      { "project": 1 }              → push to ALL devices in the project
      { "project": 1, "mac": "..." }→ push to ONE specific device

    Response:
      { "pushed": 3, "workers": 5, "devices": ["aabb...", ...] }
    """
    from apps.attendance.models import AttendanceWorker
    from apps.attendance.mqtt_models import MQTTConfig, NFCDevice
    from apps.attendance.mqtt_publish import _do_publish
    import threading

    project_id = request.data.get("project") or request.query_params.get("project")
    if not project_id:
        return Response({"error": "project is required"}, status=400)

    mac_filter = (request.data.get("mac") or "").strip().lower().replace(":", "")

    # ── Broker config ──────────────────────────────────────────────────────────
    try:
        cfg = MQTTConfig.objects.get(project_id=project_id, is_enabled=True)
    except MQTTConfig.DoesNotExist:
        return Response({"error": "No enabled MQTTConfig for this project"}, status=400)

    broker_host = cfg.broker_host or "localhost"
    broker_port = cfg.broker_port or 1883
    username    = cfg.username or ""
    password    = cfg.password or ""
    use_tls     = getattr(cfg, "use_tls", False)

    # ── Target devices ─────────────────────────────────────────────────────────
    dev_qs = NFCDevice.objects.filter(project_id=project_id)
    if mac_filter:
        dev_qs = dev_qs.filter(mac__iexact=mac_filter)

    device_macs = list(dev_qs.values_list("mac", flat=True))
    if not device_macs:
        return Response({"error": "No NFC devices registered for this project"}, status=404)

    # ── Build worker list ──────────────────────────────────────────────────────
    workers = list(
        AttendanceWorker.objects.filter(
            project_id=project_id,
            is_active=True,
        ).exclude(nfc_uid="").exclude(nfc_uid__isnull=True)
    )

    if not workers:
        return Response({"error": "No active workers with NFC UIDs for this project"}, status=404)

    entries = []
    for w in workers:
        uid_raw = str(w.nfc_uid or "").replace(" ", "").replace(":", "").upper()
        if len(uid_raw) % 2 == 0 and all(c in "0123456789ABCDEF" for c in uid_raw):
            uid_fmt = " ".join(uid_raw[i:i+2] for i in range(0, len(uid_raw), 2))
        else:
            uid_fmt = uid_raw

        entries.append({
            "uid":        uid_fmt,
            "username":   w.name or "",
            "status":     "Active",
            "schedule":   bool(w.use_custom_window),
            "start_hour": w.custom_checkin_start.hour if w.custom_checkin_start else 0,
            "end_hour":   w.custom_checkout_end.hour  if w.custom_checkout_end  else 23,
            "days_mask":  int(w.working_days_mask)     if w.working_days_mask is not None else 127,
        })

    import json as _json
    payload = _json.dumps(entries, separators=(",", ":"))

    # ── Publish to each device ─────────────────────────────────────────────────
    topics_payloads = [
        (f"nfc/{mac}/users/sync", payload)
        for mac in device_macs
    ]

    t = threading.Thread(
        target=_do_publish,
        args=(broker_host, broker_port, username, password, use_tls, topics_payloads),
        daemon=True,
    )
    t.start()

    return Response({
        "pushed":   len(device_macs),
        "workers":  len(entries),
        "devices":  device_macs,
    })
