require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const db = require('./db/database');
const authRoutes = require('./routes/authRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const libraryRoutes = require('./routes/libraryRoutes');
const spotifyRoutes = require('./routes/spotifyRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Audio streaming with HTTP 206 Partial Content support (essential for seeking)
app.get('/audio/:filename', (req, res) => {
  const filePath = path.join(__dirname, '../public/audio', req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Audio file not found');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/wav',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes'
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Static assets (images, icons, css, js)
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/marketplace', marketplaceRoutes);

// System Health & Diagnostics
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'Furina Music',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    providers: [
      { name: 'Furina Authorized Catalog', status: 'operational', streaming: true, downloads: true },
      { name: 'Spotify Official Web API', status: 'operational', streaming: true, downloads: false }
    ]
  });
});

// SPA Fallback: serve index.html for unknown routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
async function start() {
  try {
    await db.init();
    app.listen(PORT, () => {
      console.log(`[Furina Music] Server running on http://localhost:${PORT}`);
      console.log(`[Furina Music] Fontaine Opera Epiclese engine ready.`);
    });
  } catch (err) {
    console.error('[Furina Music] Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start, db };
