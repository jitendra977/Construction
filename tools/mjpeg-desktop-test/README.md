# MJPEG Desktop Test App

Small local app to stream your desktop screen as MJPEG for CCTV testing.

## Run

```bash
cd tools/mjpeg-desktop-test
npm install
npm start
```

Open:
- Control page: `http://127.0.0.1:8092`
- MJPEG URL for CCTV: `http://127.0.0.1:8092/mjpeg`

## Use in your CCTV module

Set camera:
- `name`: Desktop Test
- `stream_url`: `http://127.0.0.1:8092/mjpeg`
- `snapshot_url`: leave blank
- `is_active`: true

Then click **Start Share** on the control page and pick screen/window/tab.
