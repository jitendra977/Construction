"""
MQTT Attendance — Models
════════════════════════
Dedicated model file for all MQTT-related database state.
Kept separate from models.py so MQTT logic can be updated independently.

Models:
  MQTTConfig      — per-project broker settings + live connection state
  MQTTScanEvent   — raw event log of every MQTT NFC scan received
  NFCDevice       — fleet registry, updated from nfc/announce heartbeats

Why separate?
  • ProjectAttendanceSettings owns shift/leave/holiday config.
  • MQTTConfig owns *only* broker connectivity — different change cadence.
  • mqtt_views.py, mqtt_listener.py all import from here, never from models.py.

v2 additions (firmware 2.1.0+):
  MQTTScanEvent now stores device telemetry fields sent in the enriched payload:
    firmware_version, device_mode, gate_id, device_uptime_ms,
    device_rssi, device_free_heap, device_scan_no
  NFCDevice tracks the device fleet via nfc/announce heartbeats.
"""

from django.db import models
from django.utils import timezone


class MQTTConfig(models.Model):
    """
    One record per project.  Auto-created (with defaults) on first access
    via MQTTConfig.objects.get_or_create(project=project).

    Fields split into three groups:
      1. Broker connection  — host, ports, credentials, TLS
      2. Runtime state      — updated by the mqtt_listener process
      3. Timestamps
    """

    CONNECTION_STATUS_CHOICES = [
        ("connected",    "Connected"),
        ("disconnected", "Disconnected"),
        ("error",        "Error"),
        ("unknown",      "Unknown"),
    ]

    # ── Broker connection ─────────────────────────────────────────────────────
    project = models.OneToOneField(
        "core.HouseProject",
        on_delete=models.CASCADE,
        related_name="mqtt_config",
    )
    broker_host = models.CharField(
        max_length=255,
        default="localhost",
        help_text="MQTT broker hostname or IP address",
    )
    broker_port = models.PositiveIntegerField(
        default=1883,
        help_text="MQTT TCP port (standard: 1883, TLS: 8883)",
    )
    ws_port = models.PositiveIntegerField(
        default=9001,
        help_text=(
            "MQTT WebSocket port used by the browser client "
            "(Mosquitto default: 9001)"
        ),
    )
    topic = models.CharField(
        max_length=255,
        default="nfc/+/state",
        help_text=(
            "MQTT topic pattern.  Use + for single-level wildcard, "
            "# for multi-level.  Example: nfc/+/state"
        ),
    )
    username = models.CharField(max_length=255, blank=True, default="")
    password = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Stored in plaintext — use a dedicated broker user with minimal ACL",
    )
    use_tls = models.BooleanField(
        default=False,
        help_text="Enable TLS/SSL on broker_port",
    )
    is_enabled = models.BooleanField(
        default=True,
        help_text="Master switch — disable to pause the MQTT listener for this project",
    )

    # ── Runtime state (written by mqtt_listener, read by mqtt_status API) ─────
    connection_status = models.CharField(
        max_length=15,
        choices=CONNECTION_STATUS_CHOICES,
        default="unknown",
    )
    last_connected_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp of the most recent successful broker connection",
    )
    last_error_message = models.CharField(
        max_length=500,
        blank=True,
        help_text="Last error from the listener process (empty when healthy)",
    )
    listener_pid = models.IntegerField(
        null=True,
        blank=True,
        help_text="OS PID of the running mqtt_listener process (for health checks)",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "MQTT Configuration"

    def __str__(self):
        icon = "●" if self.connection_status == "connected" else "○"
        return f"{icon} MQTT [{self.project.name}] → {self.broker_host}:{self.broker_port}"

    # ── Convenience state mutators (call from mqtt_listener) ──────────────────

    def mark_connected(self):
        """Call when the MQTT client fires on_connect with rc=0."""
        self.connection_status = "connected"
        self.last_connected_at = timezone.now()
        self.last_error_message = ""
        self.save(update_fields=["connection_status", "last_connected_at",
                                 "last_error_message", "updated_at"])

    def mark_disconnected(self):
        """Call when the client fires on_disconnect."""
        self.connection_status = "disconnected"
        self.save(update_fields=["connection_status", "updated_at"])

    def mark_error(self, message: str):
        """Call when the client fires on_error or connection is refused."""
        self.connection_status = "error"
        self.last_error_message = str(message)[:500]
        self.save(update_fields=["connection_status", "last_error_message", "updated_at"])


class MQTTScanEvent(models.Model):
    """
    Immutable event log of every NFC scan message received over MQTT.

    v1 fields — always present:
      topic, raw_payload, nfc_uid, event_type, message, worker_name

    v2 firmware telemetry fields (firmware 2.1.0+, blank for older devices):
      firmware_version  — fw string sent in payload  e.g. "2.1.0"
      device_mode       — door_lock / attendance / hybrid
      gate_id           — gate identifier from device config
      device_uptime_ms  — milliseconds since last device reboot
      device_rssi       — WiFi RSSI in dBm (negative, e.g. -65)
      device_free_heap  — free heap RAM in bytes at scan time
      device_scan_no    — monotonic scan counter since last reboot
    """

    EVENT_TYPE_CHOICES = [
        ("success",  "Success — attendance recorded"),
        ("rejected", "Rejected — duplicate / out-of-window / wrong state"),
        ("unknown",  "Unknown UID — no matching worker"),
        ("invalid",  "Invalid — malformed payload"),
    ]

    # ── Core fields ───────────────────────────────────────────────────────────
    config = models.ForeignKey(
        MQTTConfig,
        on_delete=models.CASCADE,
        related_name="scan_events",
    )
    topic = models.CharField(max_length=255)
    raw_payload = models.TextField(
        help_text="Raw JSON string exactly as received from the broker",
    )
    nfc_uid = models.CharField(
        max_length=100,
        blank=True,
        help_text="Cleaned UID extracted from payload (spaces removed, uppercased)",
    )
    event_type = models.CharField(
        max_length=10,
        choices=EVENT_TYPE_CHOICES,
        default="unknown",
    )
    message = models.CharField(
        max_length=500,
        blank=True,
        help_text="Human-readable result (e.g. 'Check-in recorded for John Doe')",
    )
    worker_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Denormalised worker name snapshot for fast log display",
    )
    received_at = models.DateTimeField(default=timezone.now)

    # ── v2.1 offline-queue fields ─────────────────────────────────────────────
    device_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        help_text=(
            "Original scan time from the device (ts field). "
            "Non-null only for queued=1 scans replayed after reconnect. "
            "Use this instead of received_at for attendance-time display."
        ),
    )
    is_queued = models.BooleanField(
        default=False,
        help_text="True when scan was buffered on device while MQTT was offline.",
    )

    # ── v2 device telemetry ───────────────────────────────────────────────────
    firmware_version = models.CharField(
        max_length=20,
        blank=True,
        help_text="Firmware version string from device (e.g. '2.1.0')",
    )
    device_mode = models.CharField(
        max_length=20,
        blank=True,
        help_text="Device mode at scan time: door_lock / attendance / hybrid",
    )
    gate_id = models.CharField(
        max_length=64,
        blank=True,
        help_text="Gate identifier configured on the device",
    )
    device_uptime_ms = models.BigIntegerField(
        null=True,
        blank=True,
        help_text="Device uptime in milliseconds at scan time",
    )
    device_rssi = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="WiFi RSSI in dBm at scan time (e.g. -65)",
    )
    device_free_heap = models.IntegerField(
        null=True,
        blank=True,
        help_text="Free heap RAM in bytes at scan time",
    )
    device_scan_no = models.IntegerField(
        null=True,
        blank=True,
        help_text="Monotonic scan counter on the device since last reboot",
    )

    class Meta:
        ordering = ["-received_at"]
        verbose_name = "MQTT Scan Event"
        indexes = [
            models.Index(fields=["config", "-received_at"]),
            models.Index(fields=["nfc_uid"]),
        ]

    def __str__(self):
        uid = self.nfc_uid or "?"
        return f"[{self.event_type}] {uid} on {self.topic} @ {self.received_at:%H:%M:%S}"


class NFCDevice(models.Model):
    """
    Fleet registry of NFC scanner devices.

    Auto-created / updated whenever the MQTT listener receives a message on
    the global  nfc/announce  topic.  Each device publishes its announce
    payload on connect and every 5 minutes:

      {"mac":"AA:BB:CC:DD:EE:FF","device_name":"Site A Gate",
       "project_id":"1","gate_id":"main_gate","mode":"hybrid",
       "fw_version":"2.1.0","ip":"192.168.1.50"}

    One row per MAC address.  Fields are overwritten on each announce so
    the table always shows the *current* state of the fleet.
    """

    DEVICE_MODE_CHOICES = [
        ("door_lock",  "Door Lock — relay control only"),
        ("attendance", "Attendance — MQTT scan events only"),
        ("hybrid",     "Hybrid — relay + attendance"),
        ("unknown",    "Unknown"),
    ]

    mac = models.CharField(
        max_length=17,
        unique=True,
        help_text="Device MAC address (XX:XX:XX:XX:XX:XX)",
    )
    device_name = models.CharField(max_length=64, blank=True)
    project = models.ForeignKey(
        "core.HouseProject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="nfc_devices",
        help_text="Project this device belongs to (matched by project_id from announce)",
    )
    gate_id = models.CharField(max_length=64, blank=True)
    device_mode = models.CharField(
        max_length=20,
        blank=True,
        choices=DEVICE_MODE_CHOICES,
        default="unknown",
    )
    firmware_version = models.CharField(max_length=20, blank=True)
    ip_address = models.CharField(
        max_length=45,
        blank=True,
        help_text="Last known IP address (IPv4 or IPv6)",
    )

    # ── Counters ──────────────────────────────────────────────────────────────
    total_scans = models.PositiveIntegerField(
        default=0,
        help_text="Total scan events received from this device since tracking started",
    )

    # ── Timestamps ────────────────────────────────────────────────────────────
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen  = models.DateTimeField(
        auto_now=True,
        help_text="Automatically updated on every announce or scan event",
    )

    class Meta:
        verbose_name = "NFC Device"
        ordering = ["-last_seen"]
        indexes = [
            models.Index(fields=["project", "-last_seen"]),
        ]

    def __str__(self):
        name = self.device_name or self.mac
        return f"{name} ({self.mac}) — {self.device_mode}"

    # ── Upsert helper (call from mqtt_listener) ───────────────────────────────

    @classmethod
    def upsert_from_announce(cls, payload: dict):
        """
        Create or update an NFCDevice row from a parsed nfc/announce payload.
        Returns the (instance, created) tuple.

        payload keys: mac, device_name, project_id, gate_id, mode, fw_version, ip
        """
        from apps.core.models import HouseProject

        mac = (payload.get("mac") or "").upper().strip()
        if not mac:
            return None, False

        # Resolve project FK from project_id string
        project = None
        project_id_str = str(payload.get("project_id", "")).strip()
        if project_id_str:
            try:
                project = HouseProject.objects.get(pk=int(project_id_str))
            except (HouseProject.DoesNotExist, ValueError):
                pass

        device, created = cls.objects.update_or_create(
            mac=mac,
            defaults={
                "device_name":      (payload.get("device_name") or "")[:64],
                "project":          project,
                "gate_id":          (payload.get("gate_id") or "")[:64],
                "device_mode":      (payload.get("mode") or "unknown")[:20],
                "firmware_version": (payload.get("fw_version") or "")[:20],
                "ip_address":       (payload.get("ip") or "")[:45],
            },
        )
        return device, created

    def increment_scans(self):
        """Thread-safe scan counter increment."""
        NFCDevice.objects.filter(pk=self.pk).update(
            total_scans=models.F("total_scans") + 1
        )
