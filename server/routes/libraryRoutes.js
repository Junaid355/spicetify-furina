const express = require('express');
const router = express.Router();
const db = require('../db/database');
const furinaProvider = require('../providers/FurinaCatalogProvider');

// 1. Liked Songs
router.get('/likes', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const rows = await db.queryAll(`
      SELECT t.*, l.created_at as liked_at
      FROM likes l
      JOIN tracks t ON l.track_id = t.id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
    `, [user?.id || 'user_furina_default']);
    res.json(rows.map(r => furinaProvider.formatTrack(r)));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Like
router.post('/likes/toggle', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required.' });

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const existing = await db.queryGet(`
      SELECT id FROM likes WHERE user_id = ? AND track_id = ?
    `, [user.id, trackId]);

    if (existing) {
      await db.queryRun(`DELETE FROM likes WHERE id = ?`, [existing.id]);
      res.json({ liked: false, trackId });
    } else {
      await db.queryRun(`
        INSERT INTO likes (id, user_id, track_id) VALUES (?, ?, ?)
      `, [`like_${Date.now()}`, user.id, trackId]);
      res.json({ liked: true, trackId });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Play History
router.get('/history', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const rows = await db.queryAll(`
      SELECT t.*, h.played_at, h.duration_played_ms
      FROM history h
      JOIN tracks t ON h.track_id = t.id
      WHERE h.user_id = ?
      ORDER BY h.played_at DESC
      LIMIT 30
    `, [user?.id || 'user_furina_default']);
    res.json(rows.map(r => ({
      ...furinaProvider.formatTrack(r),
      playedAt: r.played_at
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/history', async (req, res) => {
  try {
    const { trackId, durationPlayedMs } = req.body;
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    await db.queryRun(`
      INSERT INTO history (id, user_id, track_id, duration_played_ms, played_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [`hist_${Date.now()}`, user.id, trackId, durationPlayedMs || 0]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Downloads Manifest & Offline storage
router.get('/downloads', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const rows = await db.queryAll(`
      SELECT t.*, d.file_path, d.file_size_bytes, d.quality, d.status, d.downloaded_at
      FROM downloads d
      JOIN tracks t ON d.track_id = t.id
      WHERE d.user_id = ?
      ORDER BY d.downloaded_at DESC
    `, [user?.id || 'user_furina_default']);

    const totalBytes = rows.reduce((acc, r) => acc + (r.file_size_bytes || 0), 0);

    res.json({
      tracks: rows.map(r => ({
        ...furinaProvider.formatTrack(r),
        downloadStatus: r.status,
        fileSizeBytes: r.file_size_bytes,
        downloadedAt: r.downloaded_at
      })),
      totalBytes,
      totalFormatted: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register authorized download
router.post('/downloads', async (req, res) => {
  try {
    const { trackId, quality } = req.body;
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    
    // Verify track is authorized for download
    const track = await furinaProvider.getTrack(trackId);
    if (!track) return res.status(404).json({ error: 'Track not found' });

    if (!track.isDownloadable || track.provider === 'spotify') {
      return res.status(403).json({
        error: 'Offline download is unavailable for this provider.',
        provider: track.provider
      });
    }

    const fileSizeBytes = 5.2 * 1024 * 1024; // Average WAV size
    await db.queryRun(`
      INSERT INTO downloads (id, user_id, track_id, file_path, file_size_bytes, quality, status)
      VALUES (?, ?, ?, ?, ?, ?, 'completed')
      ON CONFLICT(user_id, track_id) DO UPDATE SET status = 'completed', downloaded_at = CURRENT_TIMESTAMP
    `, [`dl_${Date.now()}`, user.id, trackId, track.streamUrl, fileSizeBytes, quality || 'High (PCM WAV)']);

    res.json({ success: true, message: 'Track marked as downloaded', track });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete download
router.delete('/downloads/:trackId', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    await db.queryRun(`DELETE FROM downloads WHERE user_id = ? AND track_id = ?`, [user.id, req.params.trackId]);
    res.json({ success: true, message: 'Download deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. User Settings
router.get('/settings', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const rows = await db.queryAll(`SELECT category, key, value FROM settings WHERE user_id = ?`, [user.id]);
    
    const settings = {};
    for (const r of rows) {
      if (!settings[r.category]) settings[r.category] = {};
      settings[r.category][r.key] = r.value;
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const { category, key, value } = req.body;
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    await db.queryRun(`
      INSERT INTO settings (id, user_id, category, key, value)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(user_id, category, key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `, [`set_${category}_${key}`, user.id, category, key, String(value)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
