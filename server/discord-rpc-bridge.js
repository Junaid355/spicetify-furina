/**
 * Furina Music — Native Discord RPC IPC Bridge
 * Connects directly to Discord Desktop client via Windows named pipe (\\\\?\\pipe\\discord-ipc-0)
 * and exposes a lightweight local HTTP/WebSocket endpoint for the web app.
 */
const http = require('http');
const net = require('net');

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
    console.log('[DiscordBridge] Discord pipe notice (retrying in 5s):', err.message);
    setTimeout(connectToDiscord, 5000);
  });

  discordPipe.on('close', () => {
    isDiscordReady = false;
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

// Start local HTTP bridge with CORS
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      connected: isDiscordReady,
      user: currentUser
    }));
    return;
  }

  if (req.method === 'POST' && req.url === '/rpc') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { title, artist, isPlaying } = JSON.parse(body);
        if (!isPlaying || !title) {
          // Clear activity
          sendActivity(null);
          currentActivity = null;
        } else {
          currentActivity = {
            type: 2, // Listening
            details: title.slice(0, 128),
            state: `by ${artist || 'Furina'} — Furina Music`.slice(0, 128),
            timestamps: {
              start: Math.floor(Date.now() / 1000)
            },
            assets: {
              large_image: 'furina',
              large_text: 'Furina Music (Fontaine Opera)'
            }
          };
          sendActivity(currentActivity);
        }
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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[DiscordBridge] Local Discord RPC Bridge running on http://127.0.0.1:${PORT}`);
  connectToDiscord();
});
