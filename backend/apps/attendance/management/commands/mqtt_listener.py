import os
import json
import logging
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
import paho.mqtt.client as mqtt

from apps.attendance.models import AttendanceWorker, DailyAttendance, QRScanLog

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Starts the MQTT listener for NFC attendance'

    def handle(self, *args, **options):
        # Default fallback
        broker_url = os.getenv('MQTT_BROKER_URL', 'localhost')
        broker_port = int(os.getenv('MQTT_BROKER_PORT', 1883))
        self.subscribe_topic = "nfc/+/state"
        mqtt_username = os.getenv('MQTT_USERNAME', '')
        mqtt_password = os.getenv('MQTT_PASSWORD', '')

        # Attempt to get from database
        from apps.attendance.models import ProjectAttendanceSettings
        try:
            settings_obj = ProjectAttendanceSettings.objects.first()
            if settings_obj:
                if settings_obj.mqtt_broker_url:
                    broker_url = settings_obj.mqtt_broker_url
                if settings_obj.mqtt_port:
                    broker_port = settings_obj.mqtt_port
                if settings_obj.mqtt_topic:
                    self.subscribe_topic = settings_obj.mqtt_topic
                if settings_obj.mqtt_username:
                    mqtt_username = settings_obj.mqtt_username
                if settings_obj.mqtt_password:
                    mqtt_password = settings_obj.mqtt_password
        except Exception as e:
            self.stderr.write(f"Could not load settings from DB: {e}")

        # Handle paho-mqtt 2.x API changes gracefully if installed, fallback to 1.x
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
        except AttributeError:
            client = mqtt.Client()

        if mqtt_username:
            client.username_pw_set(mqtt_username, mqtt_password or None)
            self.stdout.write(f"Using MQTT credentials for user: {mqtt_username}")

        client.on_connect = self.on_connect
        client.on_message = self.on_message

        try:
            self.stdout.write(f"Connecting to MQTT broker at {broker_url}:{broker_port}...")
            client.connect(broker_url, broker_port, 60)
            client.loop_forever()
        except Exception as e:
            self.stderr.write(f"MQTT connection failed: {e}")

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.stdout.write(self.style.SUCCESS("Connected to MQTT broker!"))
            topic = getattr(self, 'subscribe_topic', "nfc/+/state")
            client.subscribe(topic)
            self.stdout.write(f"Subscribed to {topic}")
        else:
            self.stderr.write(f"Failed to connect, return code {rc}")

    def on_message(self, client, userdata, msg):
        payload_str = msg.payload.decode('utf-8')
        topic = msg.topic
        self.stdout.write(f"Received message on {topic}: {payload_str}")

        try:
            data = json.loads(payload_str)
        except json.JSONDecodeError:
            self.stderr.write("Invalid JSON payload.")
            return

        result = data.get("result")
        raw_uid = data.get("uid")

        if result != "Granted" or not raw_uid:
            self.stdout.write("Ignoring scan: Not Granted or missing UID.")
            return

        # Clean the UID (remove spaces to match database format)
        nfc_uid = raw_uid.replace(" ", "")

        self.process_scan(nfc_uid, topic)

    def process_scan(self, nfc_uid, topic):
        from apps.attendance.views import _process_attendance_scan
        try:
            worker = AttendanceWorker.objects.select_related("project").get(
                nfc_uid=nfc_uid,
                is_active=True,
            )
        except AttendanceWorker.DoesNotExist:
            self.stderr.write(f"Worker with NFC UID {nfc_uid} not found.")
            return

        res = _process_attendance_scan(worker, scan_source=f"MQTT-{topic}")
        
        if res.get("success"):
            self.stdout.write(self.style.SUCCESS(f"Result: {res['message']} for {worker.name}"))
        else:
            self.stderr.write(f"Scan Rejected: {res.get('message')}")
