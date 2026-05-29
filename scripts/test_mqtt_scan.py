#!/usr/bin/env python3
"""
MQTT NFC Scan Simulator
══════════════════════
Simulates a physical ESP32 NFC device scanning a card.
Publishes a scan payload to the broker and listens for the backend feedback.

Usage:
  python scripts/test_mqtt_scan.py --host nishanaweb.cloud --user jitendra --pass <password> --uid 0110710071181E07
"""

import sys
import json
import time
import argparse
import random
import uuid

try:
    import paho.mqtt.client as mqtt
except ImportError:
    print("❌ Error: 'paho-mqtt' library is not installed.")
    print("Please install it locally using: pip install paho-mqtt")
    sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Simulate an NFC Card Scan via MQTT")
    parser.add_argument("--host",     default="nishanaweb.cloud", help="MQTT Broker Host")
    parser.add_argument("--port",     type=int, default=1883,     help="MQTT Broker TCP Port (usually 1883)")
    parser.add_argument("--user",     default="",                 help="MQTT Username")
    parser.add_argument("--password", default="",                 help="MQTT Password")
    parser.add_argument("--uid",      default="0110710071181E07", help="NFC Card UID to scan")
    parser.add_argument("--mac",      default="5C:CF:7F:12:34:56",help="Simulated ESP32 MAC address")
    parser.add_argument("--gate",     default="main_gate",        help="Simulated Gate ID")
    args = parser.parse_args()

    # Normalise MAC for topic path
    mac_clean = args.mac.replace(":", "").upper()
    state_topic = f"nfc/{mac_clean}/state"
    feedback_topic = f"nfc/{mac_clean}/feedback"

    print("════════════════════════════════════════════════")
    print("      MQTT NFC SCAN SIMULATOR (ESP32 EMULATOR)  ")
    print("════════════════════════════════════════════════")
    print(f"📡 Broker:    {args.host}:{args.port}")
    print(f"🔑 User:      {args.user or '(Anonymous)'}")
    print(f"💳 NFC UID:   {args.uid}")
    print(f"📟 Device MAC: {args.mac} (Clean: {mac_clean})")
    print(f"📤 Topic:     {state_topic}")
    print(f"📥 Feedback:  {feedback_topic}")
    print("────────────────────────────────────────────────")

    # Generate telemetry
    payload = {
        "uid": args.uid,
        "fw": "2.1.0",
        "mode": "hybrid",
        "gate_id": args.gate,
        "uptime_ms": random.randint(10000, 500000),
        "rssi": random.randint(-85, -45),
        "free_heap": random.randint(150000, 220000),
        "scan_no": random.randint(1, 100),
        "ts": int(time.time())
    }

    payload_str = json.dumps(payload, indent=2)
    client_id = f"sim-nfc-{uuid.uuid4().hex[:6]}"
    
    try:
        client = mqtt.Client(client_id=client_id)
    except AttributeError:
        client = mqtt.Client(client_id=client_id, clean_session=True)

    if args.user:
        client.username_pw_set(args.user, args.password or None)

    scan_success = False

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("🟢 Connected successfully to MQTT Broker!")
            # Subscribe to the feedback channel to listen for the backend response
            client.subscribe(feedback_topic)
            print(f"📥 Subscribed to feedback topic: {feedback_topic}")
            print("🚀 Publishing simulated NFC card scan...")
            client.publish(state_topic, json.dumps(payload), qos=1)
            print("📤 Scan payload sent:")
            print(payload_str)
            print("⏳ Waiting for backend response/feedback...")
        else:
            print(f"❌ Connection failed with return code: {rc}")
            sys.exit(1)

    def on_message(client, userdata, msg):
        nonlocal scan_success
        print("\n📥 [RECEIVING BACKEND FEEDBACK] ─────────────────")
        print(f"Topic: {msg.topic}")
        try:
            feedback = json.loads(msg.payload.decode())
            print(json.dumps(feedback, indent=2))
            action = feedback.get("action", "")
            worker = feedback.get("worker", "")
            success = feedback.get("success", False)

            if success:
                print(f"🎉 SUCCESS! [{worker}] checked in/out successfully ({action})!")
            else:
                print(f"⚠️ REJECTED! Backend returned an error state ({action}).")
        except Exception as e:
            print(f"Raw response: {msg.payload.decode()}")
            print(f"Failed to parse feedback: {e}")
        
        print("────────────────────────────────────────────────")
        scan_success = True
        client.disconnect()

    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(args.host, args.port, keepalive=60)
    except Exception as e:
        print(f"❌ Failed to connect to broker: {e}")
        sys.exit(1)

    # Start loop and wait up to 5 seconds for feedback response
    start_time = time.time()
    while not scan_success and (time.time() - start_time) < 5.0:
        client.loop(timeout=0.1)

    if not scan_success:
        print("\n⏳ Timeout: No feedback response received from the backend within 5 seconds.")
        print("This could mean:")
        print("  1. The backend `mqtt_listener` Django service is not running on the server.")
        print("  2. The backend is running but could not find the worker or matched project.")
        client.disconnect()

if __name__ == "__main__":
    main()
