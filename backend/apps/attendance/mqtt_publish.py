"""
mqtt_publish.py  — one-shot MQTT helper for Django views

Publishes a single worker record to every registered NFC device in the
same project via the  nfc/<mac>/users/set  topic.

Called whenever:
  • a worker's nfc_uid is assigned or changed
  • a worker's is_active flag is toggled

The device firmware handles  users/set  by upserting the entry into its
local SQLite user table so the next card tap is evaluated correctly.

Topic:    nfc/<mac>/users/set
Payload:  {"uid":"<nfc_uid>","username":"<name>","status":"Active"|"Inactive"}
"""

import json
import logging
import threading

logger = logging.getLogger(__name__)


def _do_publish(broker_host, broker_port, username, password, use_tls,
                topics_payloads):
    """Run in a background thread — connect, publish all messages, disconnect."""
    try:
        import paho.mqtt.client as mqtt
    except ImportError:
        logger.error("paho-mqtt not installed — cannot push worker to device")
        return

    client = mqtt.Client(client_id="django-push", clean_session=True)
    if username:
        client.username_pw_set(username, password)
    if use_tls:
        client.tls_set()

    try:
        client.connect(broker_host, broker_port, keepalive=10)
        client.loop_start()
        for topic, payload in topics_payloads:
            info = client.publish(topic, payload, qos=1)
            info.wait_for_publish(timeout=5)
            logger.info("MQTT push → %s : %s", topic, payload)
        client.loop_stop()
        client.disconnect()
    except Exception as exc:
        logger.warning("MQTT push failed (%s:%s): %s", broker_host, broker_port, exc)


def push_worker_to_devices(worker):
    """
    Build the users/set payload for *worker* and publish to every NFC device
    registered for that project.  Runs in a daemon thread so it never blocks
    the HTTP response.

    Safe to call even when no MQTTConfig or NfcDevice exists — it silently
    returns in that case.
    """
    if not worker.nfc_uid:
        return  # nothing to push — device wouldn't know what card to match

    project_id = worker.project_id
    if not project_id:
        return

    try:
        from apps.attendance.mqtt_models import MQTTConfig, NfcDevice

        # ── Get broker config ──────────────────────────────────────────────
        try:
            cfg = MQTTConfig.objects.get(project_id=project_id, is_enabled=True)
        except MQTTConfig.DoesNotExist:
            logger.debug("No enabled MQTTConfig for project %s — skipping push", project_id)
            return

        broker_host = cfg.broker_host or "localhost"
        broker_port = cfg.broker_port or 1883
        username    = cfg.username or ""
        password    = cfg.password or ""
        use_tls     = getattr(cfg, "use_tls", False)

        # ── Get all online devices for the project ─────────────────────────
        devices = list(
            NfcDevice.objects.filter(project_id=project_id).values_list("mac", flat=True)
        )
        if not devices:
            logger.debug("No NFC devices registered for project %s", project_id)
            return

        # ── Build payload ──────────────────────────────────────────────────
        payload = json.dumps({
            "uid":      worker.nfc_uid.upper().strip(),
            "username": worker.name or "",
            "status":   "Active" if worker.is_active else "Inactive",
        }, separators=(",", ":"))

        topics_payloads = [
            (f"nfc/{mac}/users/set", payload)
            for mac in devices
        ]

        # ── Fire-and-forget background thread ─────────────────────────────
        t = threading.Thread(
            target=_do_publish,
            args=(broker_host, broker_port, username, password, use_tls,
                  topics_payloads),
            daemon=True,
        )
        t.start()
        logger.info(
            "Queued MQTT push for worker %s (uid=%s is_active=%s) → %d device(s)",
            worker.name, worker.nfc_uid, worker.is_active, len(devices),
        )

    except Exception as exc:
        # Never crash a Django view due to MQTT
        logger.exception("push_worker_to_devices error: %s", exc)
