import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = Number(process.env.PORT || 8092);
const HOST = process.env.HOST || '127.0.0.1';

let lastFrame = null;
const mjpegClients = new Set();

function writeMjpegFrame(res, jpegBuffer) {
  res.write(`--frame\r\n`);
  res.write('Content-Type: image/jpeg\r\n');
  res.write(`Content-Length: ${jpegBuffer.length}\r\n\r\n`);
  res.write(jpegBuffer);
  res.write('\r\n');
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    try {
      const obj = JSON.parse(msg.toString());
      if (obj.type !== 'frame' || typeof obj.data !== 'string') return;
      const comma = obj.data.indexOf(',');
      if (comma < 0) return;
      const b64 = obj.data.slice(comma + 1);
      lastFrame = Buffer.from(b64, 'base64');

      for (const client of mjpegClients) {
        writeMjpegFrame(client, lastFrame);
      }
    } catch {
      // ignore bad frames
    }
  });
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ ok: true, hasFrame: !!lastFrame, mjpegClients: mjpegClients.size });
});

app.get('/mjpeg', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'multipart/x-mixed-replace; boundary=frame',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    Connection: 'close',
  });

  mjpegClients.add(res);

  if (lastFrame) {
    writeMjpegFrame(res, lastFrame);
  }

  req.on('close', () => {
    mjpegClients.delete(res);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`MJPEG desktop test app: http://${HOST}:${PORT}`);
  console.log(`MJPEG URL for CCTV: http://${HOST}:${PORT}/mjpeg`);
});
