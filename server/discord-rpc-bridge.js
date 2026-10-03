/**
 * Furina Music — Native Discord RPC IPC Bridge
 * Connects directly to Discord Desktop client via Windows named pipe (\\\\?\\pipe\\discord-ipc-0)
 * and exposes a lightweight local HTTP + WebSocket endpoint for the web app (no mixed content issues).
 */
const http = require('http');
const net = require('net');
const url = require('url');
let WebSocketServer = null;
try {
  WebSocketServer = require('ws').WebSocketServer;
} catch (_) {}

const CLIENT_ID = '383226320970055681';
const PORT = 3550;

let discordPipe = null;
let isDiscordReady = false;
let currentUser = null;
let currentActivity = null;

function encode(op, data) {
  const json = Buffer.from(JSON.stringify(data));
  const header = Buffer.alloc(8);
  header.writeInt32LE(op, 0);
  header.writeInt32LE(json.length, 4);
  return Buffer.concat([header, json]);
}

function connectToDiscord() {
  if (discordPipe) {
    try { discordPipe.destroy(); } catch (_) {}
  }

  isDiscordReady = false;
  discordPipe = net.connect('\\\\?\\pipe\\discord-ipc-0');

  discordPipe.on('connect', () => {
    console.log('[DiscordBridge] Connected to Discord IPC pipe, performing handshake...');
    discordPipe.write(encode(0, { v: 1, client_id: CLIENT_ID }));
  });

  discordPipe.on('data', (buf) => {
    try {
      const len = buf.readInt32LE(4);
      const data = JSON.parse(buf.slice(8, 8 + len).toString());

      if (data.evt === 'READY') {
        isDiscordReady = true;
        currentUser = data.data?.user || null;
        console.log(`[DiscordBridge] Discord Ready for user: ${currentUser?.global_name || currentUser?.username}`);
        broadcastWs({ type: 'ready', connected: true, user: currentUser });
        if (currentActivity) {
          sendActivity(currentActivity);
        }
      }
    } catch (err) {
      console.warn('[DiscordBridge] Parse error:', err.message);
    }
  });

  discordPipe.on('error', (err) => {
    isDiscordReady = false;
    currentUser = null;
    broadcastWs({ type: 'disconnect', connected: false });
    console.log('[DiscordBridge] Discord pipe notice (retrying in 5s):', err.message);
    setTimeout(connectToDiscord, 5000);
  });

  discordPipe.on('close', () => {
    isDiscordReady = false;
    broadcastWs({ type: 'disconnect', connected: false });
    setTimeout(connectToDiscord, 5000);
  });
}

function sendActivity(act) {
  if (!discordPipe || !isDiscordReady) return;
  const payload = {
    cmd: 'SET_ACTIVITY',
    args: {
      pid: process.pid,
      activity: act
    },
    nonce: String(Date.now())
  };
  discordPipe.write(encode(1, payload));
}

function updateActivityFromTrack({ title, artist, isPlaying, coverUrl }) {
  if (!isPlaying || !title) {
    sendActivity(null);
    currentActivity = null;
  } else {
    currentActivity = {
      type: 2, // Listening
      details: String(title).slice(0, 128),
      state: `by ${artist || 'Furina'} — Furina Music`.slice(0, 128),
      timestamps: {
        start: Math.floor(Date.now() / 1000)
      },
      assets: {
        large_image: coverUrl || 'https://raw.githubusercontent.com/Junaid355/spicetify-furina/main/public/icons/app-icon.jpg',
        large_text: 'Furina Music (Fontaine Opera)'
      }
    };
    sendActivity(currentActivity);
  }
}

// Start local HTTP bridge with CORS + PNA headers
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (req.method === 'GET' && parsedUrl.pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: isDiscordReady,
      user: currentUser,
      activity: currentActivity
    }));
    return;
  }

  if (req.method === 'GET' && parsedUrl.pathname === '/rpc') {
    const q = parsedUrl.query;
    updateActivityFromTrack({
      title: q.title,
      artist: q.artist,
      isPlaying: q.isPlaying === 'true' || q.isPlaying === '1',
      coverUrl: q.coverUrl
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, connected: isDiscordReady, user: currentUser }));
    return;
  }

  if (req.method === 'POST' && parsedUrl.pathname === '/rpc') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        updateActivityFromTrack(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, connected: isDiscordReady, user: currentUser }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end();
});

// Setup WebSocket Server for Mixed-Content Bypass
let wss = null;
const wsClients = new Set();

function broadcastWs(data) {
  const str = JSON.stringify(data);
  for (const client of wsClients) {
    if (client.readyState === 1) {
      try { client.send(str); } catch (_) {}
    }
  }
}

if (WebSocketServer) {
  wss = new WebSocketServer({ server });
  wss.on('connection', (ws) => {
    wsClients.add(ws);
    // Send initial status
    ws.send(JSON.stringify({
      type: 'status',
      connected: isDiscordReady,
      user: currentUser,
      activity: currentActivity
    }));

    ws.on('message', (msg) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.type === 'play' || data.type === 'update') {
          updateActivityFromTrack(data);
        } else if (data.type === 'pause' || data.type === 'stop') {
          updateActivityFromTrack({ isPlaying: false });
        }
      } catch (err) {
        console.warn('[DiscordBridge] WS message parse error:', err.message);
      }
    });

    ws.on('close', () => {
      wsClients.delete(ws);
    });

    ws.on('error', () => {
      wsClients.delete(ws);
    });
  });
  console.log('[DiscordBridge] WebSocket server attached on port', PORT);
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[DiscordBridge] Local Discord RPC Bridge running on http://127.0.0.1:${PORT}`);
  connectToDiscord();
});
