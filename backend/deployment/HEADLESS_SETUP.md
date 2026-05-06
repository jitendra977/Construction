# Headless Attendance Setup Guide

Run NFC attendance **24/7 without any browser open** by running the MQTT
listener as a systemd service on your server or Raspberry Pi.

---

## What this does

```
ESP32 + NFC card
      │  (WiFi → MQTT TCP port 1883)
      ▼
Mosquitto broker
      │
      ├──► mqtt_listener (this service) ──► PostgreSQL (attendance records)
      │
      └──► Browser WebSocket (kiosk / dashboard — optional for recording)
```

The moment a worker taps their card, the Python listener records it to the
database. The browser dashboard is only needed for **viewing** reports.

---

## 1. Install the service

```bash
# Copy the service file
sudo cp backend/deployment/attendance-mqtt.service /etc/systemd/system/

# Edit the file to match your paths
sudo nano /etc/systemd/system/attendance-mqtt.service
# Change:  WorkingDirectory=  to your project path
# Change:  ExecStart=         to your venv/python path
# Change:  --project 1        to your actual project ID

# Reload systemd and enable
sudo systemctl daemon-reload
sudo systemctl enable attendance-mqtt    # auto-start on boot
sudo systemctl start  attendance-mqtt
```

---

## 2. Check it's running

```bash
sudo systemctl status attendance-mqtt
```

You should see:
```
● attendance-mqtt.service - NFC Attendance MQTT Listener
     Active: active (running) since Tue 2025-05-05 08:30:00 NPT; 2min ago
```

---

## 3. View live logs

```bash
# Follow live output
sudo journalctl -u attendance-mqtt -f

# Last 50 lines
sudo journalctl -u attendance-mqtt -n 50
```

---

## 4. After code changes

```bash
sudo systemctl restart attendance-mqtt
```

---

## 5. Site Kiosk (optional — for worker feedback)

Open a browser on a tablet or Raspberry Pi to:

```
http://<your-server-ip>:5173/kiosk/<projectId>
```

Or production:
```
https://your-domain.com/kiosk/1
```

Put Chromium in kiosk mode on a Raspberry Pi:

```bash
# /etc/xdg/autostart/kiosk.desktop
[Desktop Entry]
Type=Application
Name=Attendance Kiosk
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars \
     --app=http://localhost:5173/kiosk/1
```

The kiosk page works **with or without** the systemd listener:
- If listener is running → listener records, kiosk only displays
- If listener is NOT running → kiosk records itself (fallback mode)

---

## 6. Multiple projects / gates

Run one service per project:

```bash
# /etc/systemd/system/attendance-mqtt-project2.service
ExecStart=/opt/construction/venv/bin/python manage.py mqtt_listener --project 2
```

Or use multiple gate topics — `nfc/+/state` already matches all gates.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Connection refused` | Check broker IP in MQTTConfig (Admin → Attendance → Settings) |
| `No enabled MQTTConfig` | Visit the attendance settings page once to auto-create it |
| Service keeps restarting | `journalctl -u attendance-mqtt -n 30` to see the error |
| Double scans | Normal — kiosk and listener both receive, cooldown prevents double-record |
