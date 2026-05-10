"""
MQTT Listener — Management Command  (v2)
════════════════════════════════════════
Starts a long-running Paho MQTT client that listens for NFC card scans
and records attendance via _process_attendance_scan().

v2 additions (firmware 2.1.0+):
  • Subscribes to nfc/announce for fleet tracking (NFCDevice model)
  • Extracts v2 telemetry from enriched scan payload:
      uptime_ms, rssi, free_heap, scan_no, fw, mode, gate_id
  • Publishes MQTT feedback back to the device after each scan:
      topic  nfc/<mac>/feedback
      payload {"action":"CHECK_IN","worker":"Ram","success":true}
  • Stores all telemetry fields in MQTTScanEvent

Usage:
  python manage.py mqtt_listener                    # uses first enabled MQTTConfig
  python manage.py mqtt_listener --project 3        # specific project
  python manage.py mqtt_listener --project 3 --host 192.168.1.10 --port 1883

Config source (priority order):
  1. CLI flags  (--host / --port / --topic / --user / --password)
  2. MQTTConfig row in the database for the project
  3. ProjectAttendanceSettings (legacy MQTT fields) — auto-migrated
  4. Environment variables: MQTT_BROKER_URL, MQTT_BROKER_PORT, …
  5. Built-in defaults  (localhost:1883, topic nfc/+/state)
"""

import json
import logging
import sys
import time
import uuid

from django.core.management.base import BaseCommand, CommandParser

logger = logging.getLogger(__name__)

# Exponential backoff config for reconnects
_MIN_BACKOFF = 2    # seconds
_MAX_BACKOFF = 60   # seconds

# Global announce topic — all devices publish here regardless of project
ANNOUNCE_TOPIC = "nfc/announce"


class Command(BaseCommand):
    help = "Starts the MQTT listener for NFC attendance scanning (v2)"

    # ── CLI arguments ─────────────────────────────────────────────────────────

    def add_arguments(self, parser: CommandParser):
        parser.add_argument(
            "--project",
            type=int,
            default=None,
            help="Project ID whose MQTTConfig to use.  Defaults to first enabled.",
        )
        parser.add_argument("--host",     default=None, help="Override broker hostname/IP")
        parser.add_argument("--port",     type=int, default=None, help="Override broker TCP port")
        parser.add_argument("--topic",    default=None, help="Override subscribe topic")
        parser.add_argument("--user",     default=None, help="Override MQTT username")
        parser.add_argument("--password", default=None, help="Override MQTT password")

    # ── Entry point ───────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        try:
            import paho.mqtt.client as mqtt
        except ImportError:
            self.stderr.write(self.style.ERROR(
                "paho-mqtt is not installed.  Run: pip install paho-mqtt"
            ))
            sys.exit(1)

        self.mqtt_config = self._load_config(options)
        if self.mqtt_config is None:
            self.stderr.write(self.style.ERROR(
                "No enabled MQTTConfig found.  Create one via the admin or "
                "PATCH /api/v1/attendance/mqtt/config/?project=<id>  first."
            ))
            sys.exit(1)

        cfg = self.mqtt_config

        broker_host = options["host"]     or cfg.broker_host
        broker_port = options["port"]     or cfg.broker_port
        self.topic  = options["topic"]    or cfg.topic
        username    = options["user"]     or cfg.username
        password    = options["password"] or cfg.password

        # ── Build Paho client with a PERSISTENT SESSION ───────────────────────
        # clean_session=False + a stable client_id tells the MQTT broker to
        # keep a durable queue for this subscriber even while Django is offline.
        # When the listener restarts, the broker immediately delivers every scan
        # that arrived while it was down — nothing is lost.
        #
        # IMPORTANT: the broker must have persistence enabled.
        # Mosquitto: add  persistence true  to /etc/mosquitto/mosquitto.conf
        #            (it is the default in most Mosquitto packages).
        project_pk  = cfg.project.pk if hasattr(cfg.project, "pk") else "0"
        # Adding a random suffix prevents 'ping-pong' disconnects if multiple
        # instances of the listener are started (e.g. two terminals running make local).
        client_id   = f"django-nfc-listener-proj{project_pk}-{uuid.uuid4().hex[:4]}"
        self.stdout.write(f"  MQTT client_id: {client_id}")
        try:
            client = mqtt.Client(
                mqtt.CallbackAPIVersion.VERSION1,
                client_id=client_id,
                clean_session=True,
            )
        except (AttributeError, TypeError):
            client = mqtt.Client(client_id=client_id, clean_session=True)

        if username:
            client.username_pw_set(username, password or None)
            self.stdout.write(f"  MQTT credentials for user: {username}")

        client.on_connect    = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message    = self._on_message

        self._client          = client
        self._reconnect_count = 0          # how many times we've had to reconnect
        self._backoff         = _MIN_BACKOFF  # current backoff delay in seconds

        def _shutdown(signum, frame):
            self.stdout.write("\nShutting down MQTT listener…")
            client.disconnect()
            cfg.mark_disconnected()
            sys.exit(0)

        signal.signal(signal.SIGTERM, _shutdown)
        signal.signal(signal.SIGINT,  _shutdown)

        if hasattr(cfg, "pk") and cfg.pk:
            cfg.listener_pid = os.getpid()
            cfg.save(update_fields=["listener_pid"])

        self.stdout.write(
            f"Connecting to MQTT broker at {broker_host}:{broker_port}  "
            f"(topic: {self.topic})  [project: {cfg.project}]"
        )
        try:
            # keepalive=25 sends a PINGREQ every 25 s — shorter than most
            # cloud brokers' 30 s idle timeout, preventing server-side disconnects.
            # reconnect_delay_set adds Paho's built-in jittered backoff on top
            # of our manual exponential backoff in _on_disconnect.
            client.reconnect_delay_set(min_delay=2, max_delay=60)
            client.connect(broker_host, broker_port, keepalive=25)
            client.loop_forever(retry_first_connection=True)
        except Exception as exc:
            err_msg = str(exc)
            self.stderr.write(self.style.ERROR(f"MQTT connection failed: {err_msg}"))
            cfg.mark_error(err_msg)
            sys.exit(1)

    # ── Config loader ─────────────────────────────────────────────────────────

    def _load_config(self, options):
        from apps.attendance.mqtt_models import MQTTConfig

        project_id = options.get("project")
        cfg = None

        try:
            if project_id:
                cfg = MQTTConfig.objects.filter(
                    project_id=project_id, is_enabled=True
                ).select_related("project").first()
                if cfg is None:
                    self.stdout.write(self.style.WARNING(
                        f"No enabled MQTTConfig for project {project_id} — "
                        "will try ProjectAttendanceSettings"
                    ))
            else:
                cfg = MQTTConfig.objects.filter(
                    is_enabled=True
                ).select_related("project").first()

        except Exception as table_err:
            self.stdout.write(self.style.WARNING(
                f"MQTTConfig table not ready ({table_err}). "
                "Run: python manage.py migrate attendance"
            ))
            cfg = None

        if cfg is not None and cfg.broker_host in ("localhost", "127.0.0.1", ""):
            cfg = self._migrate_broker_from_legacy(cfg)

        if cfg is not None:
            return cfg

        # Fallback: ProjectAttendanceSettings
        try:
            from apps.attendance.models import ProjectAttendanceSettings
            qs = ProjectAttendanceSettings.objects.select_related("project")
            if project_id:
                qs = qs.filter(project_id=project_id)
            legacy = qs.first()
            if legacy and legacy.mqtt_broker_url and \
                    legacy.mqtt_broker_url not in ("localhost", "127.0.0.1", ""):
                self.stdout.write(self.style.WARNING(
                    f"Using broker from ProjectAttendanceSettings: "
                    f"{legacy.mqtt_broker_url}:{legacy.mqtt_port}"
                ))

                class _LegacyConfig:
                    broker_host  = legacy.mqtt_broker_url
                    broker_port  = legacy.mqtt_port or 1883
                    topic        = legacy.mqtt_topic or "nfc/+/state"
                    username     = legacy.mqtt_username or ""
                    password     = legacy.mqtt_password or ""
                    listener_pid = None
                    project      = legacy.project
                    pk           = None

                    def mark_connected(self):    pass
                    def mark_disconnected(self): pass
                    def mark_error(self, msg):   pass
                    def save(self, **kw):        pass

                return _LegacyConfig()
        except Exception as legacy_err:
            self.stdout.write(self.style.WARNING(
                f"Could not read ProjectAttendanceSettings: {legacy_err}"
            ))

        # Last resort: environment variables
        broker_url = os.getenv("MQTT_BROKER_URL")
        if broker_url:
            self.stdout.write(self.style.WARNING(
                "No MQTTConfig in database — using environment variables."
            ))

            class _EnvConfig:
                broker_host  = broker_url
                broker_port  = int(os.getenv("MQTT_BROKER_PORT", 1883))
                topic        = os.getenv("MQTT_TOPIC", "nfc/+/state")
                username     = os.getenv("MQTT_USERNAME", "")
                password     = os.getenv("MQTT_PASSWORD", "")
                listener_pid = None
                project      = "(env)"
                pk           = None

                def mark_connected(self):    pass
                def mark_disconnected(self): pass
                def mark_error(self, msg):   pass
                def save(self, **kw):        pass

            return _EnvConfig()

        return None

    def _migrate_broker_from_legacy(self, cfg):
        try:
            from apps.attendance.models import ProjectAttendanceSettings
            legacy = ProjectAttendanceSettings.objects.filter(project=cfg.project).first()
            if not legacy:
                return cfg
            real_host = legacy.mqtt_broker_url or ""
            if real_host in ("", "localhost", "127.0.0.1"):
                return cfg

            self.stdout.write(self.style.WARNING(
                f"MQTTConfig has default localhost — auto-upgrading broker "
                f"from ProjectAttendanceSettings: {real_host}:{legacy.mqtt_port}"
            ))
            cfg.broker_host = real_host
            if legacy.mqtt_port:     cfg.broker_port = legacy.mqtt_port
            if legacy.mqtt_topic:    cfg.topic       = legacy.mqtt_topic
            if legacy.mqtt_username: cfg.username    = legacy.mqtt_username
            if legacy.mqtt_password: cfg.password    = legacy.mqtt_password
            cfg.save(update_fields=[
                "broker_host", "broker_port", "topic",
                "username", "password", "updated_at",
            ])
            self.stdout.write(self.style.SUCCESS(
                f"  MQTTConfig updated — broker is now {cfg.broker_host}:{cfg.broker_port}"
            ))
        except Exception as exc:
            self.stdout.write(self.style.WARNING(
                f"  Could not auto-upgrade MQTTConfig: {exc}"
            ))
        return cfg

    # ── Paho callbacks ────────────────────────────────────────────────────────

    def _on_connect(self, client, userdata, flags, rc):
        cfg = self.mqtt_config
        if rc == 0:
            is_reconnect = self._reconnect_count > 0
            self._reconnect_count += 1
            self._backoff = _MIN_BACKOFF  # reset backoff on successful connect

            if is_reconnect:
                # Quiet reconnect — just a single line instead of 5
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Reconnected to MQTT broker (attempt #{self._reconnect_count})")
                )
            else:
                # First connect — print full subscription list
                self.stdout.write(self.style.SUCCESS("✓ Connected to MQTT broker"))
                client.subscribe(self.topic)
                self.stdout.write(f"  Subscribed to: {self.topic}")
                client.subscribe(ANNOUNCE_TOPIC)
                self.stdout.write(f"  Subscribed to: {ANNOUNCE_TOPIC}")
                client.subscribe("nfc/+/users/request")
                self.stdout.write("  Subscribed to: nfc/+/users/request")
                client.subscribe("nfc/+/error_state")
                self.stdout.write("  Subscribed to: nfc/+/error_state")

            # Re-subscribe on every connect (Paho requires this even on resuming sessions)
            if is_reconnect:
                client.subscribe(self.topic)
                client.subscribe(ANNOUNCE_TOPIC)
                client.subscribe("nfc/+/users/request")
                client.subscribe("nfc/+/error_state")

            cfg.mark_connected()
        else:
            err = f"Connection refused — return code {rc}"
            self.stderr.write(self.style.ERROR(err))
            cfg.mark_error(err)

    def _on_disconnect(self, client, userdata, rc):
        self.mqtt_config.mark_disconnected()
        if rc != 0:
            # rc=7 = server closed connection (broker keepalive / session limit)
            reason = {
                1: "unacceptable protocol version",
                2: "client identifier rejected",
                3: "server unavailable",
                4: "bad credentials",
                5: "not authorised",
                7: "connection lost (check for Client ID conflict or broker timeout)",
            }.get(rc, f"code {rc}")
            self.stdout.write(
                self.style.WARNING(f"MQTT disconnected ({reason}) — reconnecting in {self._backoff}s…")
            )
            # Exponential backoff — sleep here so loop_forever doesn't spin wildly
            time.sleep(self._backoff)
            self._backoff = min(self._backoff * 2, _MAX_BACKOFF)

    def _on_message(self, client, userdata, msg):
        """Route message to the appropriate handler by topic."""
        payload_str = msg.payload.decode("utf-8", errors="replace")
        self.stdout.write(f"← {msg.topic}: {payload_str[:200]}")

        # ── nfc/announce → fleet registry ─────────────────────────────────────
        if msg.topic == ANNOUNCE_TOPIC:
            self._process_announce(payload_str)
            return

        # ── nfc/<mac>/users/request → full user-table sync ────────────────────
        if msg.topic.endswith("/users/request"):
            mac = self._mac_from_topic(msg.topic)
            self._process_users_request(mac)
            return

        # ── nfc/<mac>/error_state → device error status ───────────────────────
        if msg.topic.endswith("/error_state"):
            mac = self._mac_from_topic(msg.topic)
            self._process_error_state(mac, payload_str)
            return

        # ── nfc/<mac>/state → attendance scan ─────────────────────────────────
        try:
            data = json.loads(payload_str)
        except json.JSONDecodeError:
            self.stderr.write("  Invalid JSON payload — ignored")
            self._log_event(msg.topic, payload_str, "", "invalid", "Malformed JSON payload")
            return

        raw_uid = data.get("uid") or data.get("UID") or data.get("id") or ""
        if not raw_uid:
            self.stdout.write("  No UID field in payload — ignored")
            self._log_event(msg.topic, payload_str, "", "invalid", "Missing UID field")
            return

        nfc_uid = str(raw_uid).replace(" ", "").upper()

        # v2 telemetry fields (absent / None for older firmware — stored as blank/null)
        telemetry = {
            "firmware_version": str(data.get("fw",        "") or "")[:20],
            "device_mode":      str(data.get("mode",      "") or "")[:20],
            "gate_id":          str(data.get("gate_id",   "") or "")[:64],
            "device_uptime_ms": data.get("uptime_ms"),
            "device_rssi":      data.get("rssi"),
            "device_free_heap": data.get("free_heap"),
            "device_scan_no":   data.get("scan_no"),
        }

        # v2.1 offline-queue: extract device timestamp and queued flag
        is_queued = bool(data.get("queued", 0))
        device_ts = None
        raw_ts = data.get("ts")
        if raw_ts:
            try:
                import datetime
                from django.utils import timezone as dj_tz
                device_ts = dj_tz.make_aware(
                    datetime.datetime.utcfromtimestamp(int(raw_ts)),
                    datetime.timezone.utc,
                )
            except (ValueError, OSError, OverflowError):
                device_ts = None

        # ── Detect replay type and compute effective scan_time ────────────────
        # Case A — is_queued=True: firmware buffered this on-device while MQTT
        #          was down.  device_ts is the moment the card was scanned.
        # Case B — is_queued=False but device_ts is old: Django was offline
        #          while MQTT was still up.  The broker queued the message.
        #          device_ts is still the original scan time — use it so the
        #          attendance record reflects when the worker actually scanned.
        # Case C — no device_ts: v1 firmware or clock not synced → use server now.

        from django.utils import timezone as dj_tz
        server_lag_secs = 0
        if device_ts:
            server_lag_secs = (dj_tz.now() - device_ts).total_seconds()

        # Treat any scan with device_ts as the authoritative time, but reject
        # timestamps that are clearly wrong (future or > 24 h in the past).
        use_device_ts = (
            device_ts is not None
            and -60 <= server_lag_secs <= 86400   # within 24 h window
        )

        if is_queued:
            lag_str = f"{server_lag_secs:.0f}s ago" if device_ts else "unknown lag"
            self.stdout.write(f"  [ESP32 OFFLINE REPLAY] device queued scan {lag_str}")
        elif use_device_ts and server_lag_secs > 60:
            self.stdout.write(
                self.style.WARNING(
                    f"  [SERVER OFFLINE REPLAY] scan from {server_lag_secs:.0f}s ago "
                    f"(device ts={device_ts:%Y-%m-%d %H:%M:%S}) — Django was down, "
                    f"MQTT broker held this message"
                )
            )

        # MAC is the middle segment of the topic: nfc/<mac>/state
        mac = self._mac_from_topic(msg.topic)

        self._process_scan(
            nfc_uid, msg.topic, payload_str, telemetry, mac,
            device_ts=device_ts if use_device_ts else None,
            is_queued=(is_queued or (use_device_ts and server_lag_secs > 60)),
        )

    # ── Users request handler ─────────────────────────────────────────────────

    def _process_users_request(self, mac: str):
        """
        Handle  nfc/<mac>/users/request  — device asks for a full user-table sync.

        Firmware publishes this (empty payload) every time it reconnects to the
        MQTT broker so its local cache is immediately up to date.

        Response: publish  nfc/<mac>/users/sync  with a JSON array of all active
        workers that have an NFC UID assigned for the device's project.

        Project resolution order:
          1. NFCDevice row matched by MAC → project_id
          2. MQTTConfig attached to this listener → project

        Array element format (matches firmware handle_users_sync parser):
          {"uid":"..","username":"..","status":"Active",
           "schedule":true,"start_hour":8,"end_hour":18,"days_mask":62}
        """
        from apps.attendance.models import AttendanceWorker
        from apps.attendance.mqtt_models import NFCDevice

        if not mac:
            self.stderr.write("  users/request: could not extract MAC from topic")
            return

        # ── Resolve project ────────────────────────────────────────────────────
        project = None
        try:
            device = NFCDevice.objects.filter(mac__iexact=mac).first()
            if device and device.project_id:
                project = device.project
        except Exception as exc:
            logger.warning("users/request: NFCDevice lookup failed: %s", exc)

        if project is None:
            # Fall back to the project this listener instance is attached to
            cfg = self.mqtt_config
            project = getattr(cfg, "project", None)

        if project is None:
            self.stderr.write(
                f"  users/request from {mac}: cannot determine project — no response sent"
            )
            return

        # ── Fetch all active workers with an NFC UID for this project ──────────
        try:
            workers = AttendanceWorker.objects.filter(
                project=project,
                is_active=True,
            ).exclude(nfc_uid="").exclude(nfc_uid__isnull=True)
        except Exception as exc:
            logger.warning("users/request: worker query failed: %s", exc)
            return

        if not workers.exists():
            # Send empty array so device knows the project has no enrolled cards
            payload = "[]"
        else:
            entries = []
            for w in workers:
                uid_clean = str(w.nfc_uid or "").strip()
                if not uid_clean:
                    continue

                # Normalise UID to the space-separated uppercase format the
                # firmware stores (e.g. "AB CD EF 12").  If the stored value is
                # already in that format this is a no-op; otherwise it formats
                # from hex (e.g. "ABCDEF12" → "AB CD EF 12").
                raw = uid_clean.replace(" ", "").replace(":", "")
                if len(raw) % 2 == 0 and all(c in "0123456789ABCDEFabcdef" for c in raw):
                    uid_fmt = " ".join(raw[i:i+2].upper() for i in range(0, len(raw), 2))
                else:
                    uid_fmt = uid_clean.upper()

                entry = {
                    "uid":        uid_fmt,
                    "username":   w.name,
                    "status":     "Active",
                    "schedule":   bool(w.use_custom_window),
                    "start_hour": w.custom_checkin_start.hour if w.custom_checkin_start else 0,
                    "end_hour":   w.custom_checkout_end.hour  if w.custom_checkout_end  else 23,
                    "days_mask":  int(w.working_days_mask)     if w.working_days_mask is not None else 127,
                }
                entries.append(entry)

            payload = json.dumps(entries)

        # ── Publish sync response ──────────────────────────────────────────────
        sync_topic = f"nfc/{mac}/users/sync"
        try:
            self._client.publish(sync_topic, payload, qos=1)
            self.stdout.write(
                self.style.SUCCESS(
                    f"  → users/sync → {sync_topic} ({len(entries if workers.exists() else [])} workers)"
                )
            )
        except Exception as exc:
            logger.warning("users/request: publish failed: %s", exc)

    # ── Error state handler ───────────────────────────────────────────────────

    def _process_error_state(self, mac: str, error_str: str):
        """
        Handle  nfc/<mac>/error_state  messages from the firmware diagnostic_task.

        The firmware publishes:
          "OK"             — all systems healthy (clears any previous error)
          "No Wi-Fi"       — WiFi just reconnected so MQTT is up; clearing is normal
          "No MQTT"        — MQTT broker unreachable (WiFi still up)
          "PN532 Error"    — NFC reader hardware fault
          "Door Left Open" — Door held open > alarm threshold

        We track the first-seen timestamp so the dashboard can show how long
        the error has been active.  Pushing a user list to a device in error
        state is blocked by the dashboard UI (NfcDevicesPanel).
        """
        from apps.attendance.mqtt_models import NFCDevice
        from django.utils import timezone

        error = (error_str or "").strip()
        if not mac:
            return

        is_ok = (error == "" or error.upper() == "OK")

        try:
            device = NFCDevice.objects.filter(mac__iexact=mac).first()
            if not device:
                return  # Unknown device — ignore until it announces itself

            if is_ok:
                if device.error_state:
                    self.stdout.write(self.style.SUCCESS(
                        f"  ✓ Device {mac} error cleared (was: {device.error_state})"
                    ))
                device.error_state = ""
                device.error_since = None
            else:
                if device.error_state != error:
                    # New error type — record onset time
                    device.error_since = timezone.now()
                    self.stdout.write(self.style.WARNING(
                        f"  ⚠ Device {mac} error: {error}"
                    ))
                device.error_state = error

            device.save(update_fields=["error_state", "error_since"])

        except Exception as exc:
            logger.warning("_process_error_state failed for %s: %s", mac, exc)

    # ── Announce handler ──────────────────────────────────────────────────────

    def _process_announce(self, payload_str: str):
        """
        Handle nfc/announce heartbeat — upsert NFCDevice row.

        Payload:
          {"mac":"AA:BB:CC:DD:EE:FF","device_name":"Site A Gate",
           "project_id":"1","gate_id":"main_gate","mode":"hybrid",
           "fw_version":"2.1.0","ip":"192.168.1.50"}
        """
        from apps.attendance.mqtt_models import NFCDevice

        try:
            data = json.loads(payload_str)
        except json.JSONDecodeError:
            self.stderr.write("  announce: invalid JSON — ignored")
            return

        try:
            device, created = NFCDevice.upsert_from_announce(data)
            if device:
                verb = "registered" if created else "updated"
                self.stdout.write(self.style.SUCCESS(
                    f"  Device {verb}: {device.mac} ({device.device_name}) "
                    f"fw={device.firmware_version} ip={device.ip_address}"
                ))
                # Announce means the device just (re)connected — clear any
                # stale error state so the dashboard shows it as healthy.
                if device.error_state:
                    device.error_state = ""
                    device.error_since = None
                    device.save(update_fields=["error_state", "error_since"])
                    self.stdout.write(self.style.SUCCESS(
                        f"  Error state cleared on reconnect for {device.mac}"
                    ))
        except Exception as exc:
            logger.warning("Failed to upsert NFCDevice: %s", exc)

    # ── Scan processing ───────────────────────────────────────────────────────

    def _process_scan(self, nfc_uid: str, topic: str, raw_payload: str,
                      telemetry: dict, mac: str,
                      device_ts=None, is_queued: bool = False):
        """
        Resolve UID → worker, record attendance, publish feedback, log event.

        device_ts  — aware datetime from the device's 'ts' field (None for old firmware)
        is_queued  — True for:
                       • firmware-side offline queue (ESP32 buffered while MQTT was down)
                       • server-side offline queue (broker held message while Django was down)
                     In both cases, device_ts carries the real scan time and is used as
                     the attendance timestamp so records are not timestamped "now".
        """
        from apps.attendance.models import AttendanceWorker
        from apps.attendance.views import _process_attendance_scan
        from apps.attendance.mqtt_models import NFCDevice

        try:
            worker = AttendanceWorker.objects.select_related("project").get(
                nfc_uid=nfc_uid,
                is_active=True,
            )
        except AttendanceWorker.DoesNotExist:
            msg = f"No active worker for NFC UID: {nfc_uid}"
            self.stdout.write(f"  {msg}")
            self._log_event(topic, raw_payload, nfc_uid, "unknown", msg,
                            telemetry=telemetry, device_ts=device_ts, is_queued=is_queued)
            self._publish_feedback(mac, "ERROR", "", False)
            return
        except AttendanceWorker.MultipleObjectsReturned:
            msg = f"Duplicate NFC UID {nfc_uid} — check worker records"
            self.stderr.write(self.style.WARNING(f"  {msg}"))
            self._log_event(topic, raw_payload, nfc_uid, "invalid", msg,
                            telemetry=telemetry, device_ts=device_ts, is_queued=is_queued)
            self._publish_feedback(mac, "ERROR", "", False)
            return

        # Use device_ts as the canonical scan time whenever it is available.
        # This covers three replay scenarios:
        #   1. is_queued=True  → ESP32 offline queue (MQTT was down)
        #   2. is_queued=True  → server offline replay (Django was down, broker queued)
        #   3. is_queued=False → live scan with valid device clock (normal path)
        # If device_ts is None (v1 firmware / clock not synced) we fall back to now.
        scan_time = device_ts  # already None when not trusted (filtered upstream)

        # Build a descriptive source tag for the QRScanLog.user_agent field
        if is_queued and device_ts:
            from django.utils import timezone as dj_tz
            lag = int((dj_tz.now() - device_ts).total_seconds())
            scan_src = f"MQTT/{topic}[replay +{lag}s]"
        else:
            scan_src = f"MQTT/{topic}"

        result = _process_attendance_scan(
            worker,
            scan_source=scan_src,
            scan_time=scan_time,
        )

        if result.get("success"):
            # action is "CHECK_IN" or "CHECK_OUT" — matches firmware feedback strings
            action     = result.get("action", "CHECK_IN")
            event_type = "success"
            self.stdout.write(self.style.SUCCESS(
                f"  ✓ {result.get('message')} [{worker.name}] → {action}"
            ))
        else:
            action     = "ERROR"
            event_type = "rejected"
            self.stdout.write(f"  ✗ {result.get('message')} [{worker.name}]")

        self._log_event(
            topic, raw_payload, nfc_uid, event_type,
            result.get("message", ""),
            worker_name=worker.name,
            telemetry=telemetry,
            device_ts=device_ts,
            is_queued=is_queued,
        )

        # Send buzzer/LED feedback to the originating device
        self._publish_feedback(mac, action, worker.name, result.get("success", False))

        # Bump scan counter on NFCDevice row (fire-and-forget)
        if mac:
            try:
                device = NFCDevice.objects.filter(mac__iexact=mac).first()
                if device:
                    device.increment_scans()
            except Exception:
                pass

    # ── MQTT feedback publisher ───────────────────────────────────────────────

    def _publish_feedback(self, mac: str, action: str,
                          worker_name: str, success: bool):
        """
        Publish attendance result to the originating device.

        Topic:   nfc/<mac>/feedback
        Payload: {"action":"CHECK_IN","worker":"Ram","success":true}

        action values (matched by firmware nfc_app_play_feedback):
          "CHECK_IN"  — rising melody + green LED double-flash
          "CHECK_OUT" — descending melody + green LED single flash
          "ERROR"     — error buzz + red LED
        """
        if not mac or not getattr(self, "_client", None):
            return

        # Firmware uses 12-char lowercase hex MAC without colons as its ID
        mac_id = mac.replace(":", "").lower()
        topic  = f"nfc/{mac_id}/feedback"
        payload = json.dumps({
            "action":  action,
            "worker":  worker_name,
            "success": success,
        })

        try:
            self._client.publish(topic, payload, qos=1)
            self.stdout.write(f"  → feedback [{topic}]: {payload}")
        except Exception as exc:
            logger.warning("Failed to publish feedback to %s: %s", topic, exc)

    # ── Event logging ─────────────────────────────────────────────────────────

    def _log_event(self, topic: str, raw_payload: str, nfc_uid: str,
                   event_type: str, message: str, worker_name: str = "",
                   telemetry: dict = None, device_ts=None, is_queued: bool = False):
        """
        Persist an MQTTScanEvent row including v2 telemetry and offline-queue fields.
        Silently skips when running in env-var fallback mode (no DB pk).
        """
        from apps.attendance.mqtt_models import MQTTScanEvent

        cfg = self.mqtt_config
        if not getattr(cfg, "pk", None):
            return

        tel = telemetry or {}

        try:
            MQTTScanEvent.objects.create(
                config=cfg,
                topic=topic,
                raw_payload=raw_payload[:4096],
                nfc_uid=nfc_uid,
                event_type=event_type,
                message=message[:500],
                worker_name=worker_name,
                # v2 telemetry
                firmware_version=tel.get("firmware_version", ""),
                device_mode=tel.get("device_mode", ""),
                gate_id=tel.get("gate_id", ""),
                device_uptime_ms=tel.get("device_uptime_ms"),
                device_rssi=tel.get("device_rssi"),
                device_free_heap=tel.get("device_free_heap"),
                device_scan_no=tel.get("device_scan_no"),
                # v2.1 offline-queue
                device_timestamp=device_ts,
                is_queued=is_queued,
            )
        except Exception as exc:
            logger.warning("Failed to write MQTTScanEvent: %s", exc)

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _mac_from_topic(topic: str) -> str:
        """
        Extract device identifier from 'nfc/<mac>/state'.
        Returns empty string if topic format doesn't match.
        """
        parts = topic.split("/")
        if len(parts) >= 2:
            return parts[1]   # 12-char lowercase hex, e.g. "aabbccddeeff"
        return ""
