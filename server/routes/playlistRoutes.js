const express = require('express');
const router = express.Router();
const db = require('../db/database');
const syncService = require('../services/syncService');
const furinaProvider = require('../providers/FurinaCatalogProvider');

// List all playlists
router.get('/', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const playlists = await db.queryAll(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      WHERE p.user_id = ? OR p.is_public = 1
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `, [user?.id || 'user_furina_default']);
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single playlist with ordered tracks
router.get('/:id', async (req, res) => {
  try {
    const playlist = await furinaProvider.getPlaylist(req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create native Furina playlist
router.post('/', async (req, res) => {
  try {
    const { name, description, coverUrl, isPublic } = req.body;
    if (!name) return res.status(400).json({ error: 'Playlist name is required.' });

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const id = `pl_custom_${Date.now()}`;

    await db.queryRun(`
      INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, provider, is_imported, sync_status)
      VALUES (?, ?, ?, ?, ?, ?, 'furina', 0, 'synced')
    `, [
      id,
      user?.id || 'user_furina_default',
      name,
      description || 'Created in Furina Music',
      coverUrl || '/images/furina_salon_music.jpg',
      isPublic !== undefined ? (isPublic ? 1 : 0) : 1
    ]);

    const created = await furinaProvider.getPlaylist(id);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update playlist
router.put('/:id', async (req, res) => {
  try {
    const { name, description, coverUrl, isPublic } = req.body;
    await db.queryRun(`
      UPDATE playlists 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          cover_url = COALESCE(?, cover_url),
          is_public = COALESCE(?, is_public),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, coverUrl, isPublic !== undefined ? (isPublic ? 1 : 0) : null, req.params.id]);

    const updated = await furinaProvider.getPlaylist(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete playlist
router.delete('/:id', async (req, res) => {
  try {
    await db.queryRun(`DELETE FROM playlists WHERE id = ?`, [req.params.id]);
    res.json({ success: true, message: 'Playlist deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add track to playlist
router.post('/:id/tracks', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required.' });

    const maxPosRow = await db.queryGet(`
      SELECT MAX(position) as max_pos FROM playlist_tracks WHERE playlist_id = ?
    `, [req.params.id]);
    const nextPos = (maxPosRow?.max_pos ?? -1) + 1;

    await db.queryRun(`
      INSERT INTO playlist_tracks (id, playlist_id, track_id, position)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(playlist_id, track_id) DO NOTHING
    `, [`${req.params.id}_${trackId}`, req.params.id, trackId, nextPos]);

    await db.queryRun(`UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    const updated = await furinaProvider.getPlaylist(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove track from playlist
router.delete('/:id/tracks/:trackId', async (req, res) => {
  try {
    await db.queryRun(`
      DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?
    `, [req.params.id, req.params.trackId]);

    await db.queryRun(`UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    res.json({ success: true, message: 'Track removed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reorder tracks
router.put('/:id/reorder', async (req, res) => {
  try {
    const { trackIds } = req.body; // Array of track IDs in desired order
    if (!Array.isArray(trackIds)) return res.status(400).json({ error: 'trackIds array required.' });

    let pos = 0;
    for (const tid of trackIds) {
      await db.queryRun(`
        UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND track_id = ?
      `, [pos++, req.params.id, tid]);
    }
    await db.queryRun(`UPDATE playlists SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [req.params.id]);

    const updated = await furinaProvider.getPlaylist(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SPOTIFY PLAYLIST IMPORT ("Import to Furina")
router.post('/import/spotify', async (req, res) => {
  try {
    const { spotifyPlaylistId } = req.body;
    if (!spotifyPlaylistId) return res.status(400).json({ error: 'spotifyPlaylistId is required.' });

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const spAccount = await db.queryGet(`SELECT access_token FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user.id]);

    const imported = await syncService.importSpotifyPlaylist(
      user?.id || 'user_furina_default',
      spotifyPlaylistId,
      spAccount?.access_token || null
    );

    res.status(201).json(imported);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. PLAYLIST SYNCHRONIZATION
router.post('/:id/sync', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const spAccount = await db.queryGet(`SELECT access_token FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user.id]);

    const result = await syncService.syncPlaylist(
      user?.id || 'user_furina_default',
      req.params.id,
      spAccount?.access_token || null
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
