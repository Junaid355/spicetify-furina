const express = require('express');
const router = express.Router();
const db = require('../db/database');
const spotifyProvider = require('../providers/SpotifyProvider');
const syncService = require('../services/syncService');

// Helper to get active user's Spotify access token
async function getSpotifyToken() {
  const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
  const account = await db.queryGet(`
    SELECT access_token, refresh_token, token_expires_at 
    FROM provider_accounts 
    WHERE user_id = ? AND provider = 'spotify'
  `, [user?.id]);

  if (!account) return null;

  // Check if expired and needs refresh
  if (account.token_expires_at && new Date(account.token_expires_at) < new Date() && account.refresh_token) {
    try {
      const refreshed = await spotifyProvider.refreshAccessToken(account.refresh_token);
      const newExpiresAt = new Date(Date.now() + (refreshed.expires_in || 3600) * 1000).toISOString();
      await db.queryRun(`
        UPDATE provider_accounts 
        SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND provider = 'spotify'
      `, [refreshed.access_token, newExpiresAt, user.id]);
      return refreshed.access_token;
    } catch (err) {
      console.warn('[Spotify Token] Refresh failed:', err.message);
    }
  }

  return account.access_token;
}

// 1. Diagnostics Dashboard Endpoint (Prompt Section 18)
router.get('/diagnostics', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    const testResult = await spotifyProvider.testConnection(token);
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const account = await db.queryGet(`SELECT * FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user?.id]);

    res.json({
      timestamp: new Date().toISOString(),
      oauth: {
        configured: Boolean(spotifyProvider.clientId),
        clientId: spotifyProvider.clientId ? `${spotifyProvider.clientId.substring(0, 6)}...` : 'Not Set',
        redirectUri: spotifyProvider.redirectUri,
        tokenPresent: Boolean(token),
        tokenExpiresAt: account?.token_expires_at || null,
        isExpired: account?.token_expires_at ? new Date(account.token_expires_at) < new Date() : true,
        scopes: account?.scope?.split(' ') || []
      },
      connection: testResult,
      apiHealth: {
        endpoint: spotifyProvider.apiBase,
        status: testResult.connected ? 'OK' : (token ? 'Degraded' : 'Awaiting Connection')
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Fetch User's Real Spotify Playlists (Prompt Section 20)
router.get('/user-playlists', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    if (!token) {
      // Return curated Spotify catalog playlists when not logged in
      const demo = [
        {
          id: 'spotify_curated_classical',
          name: 'Classical & Fontaine Grandeur',
          description: 'Official Spotify playlist featuring grand symphonies and court suites.',
          images: [{ url: '/images/furina_opera_tears.jpg' }],
          tracks: { total: 4 },
          owner: { display_name: 'Spotify Classical' }
        },
        {
          id: 'sp_fontaine_piano',
          name: 'Baroque Keyboard Solitaires',
          description: 'Bach and Debussy impressionist masterworks.',
          images: [{ url: '/images/furina_salon_music.jpg' }],
          tracks: { total: 3 },
          owner: { display_name: 'Fontaine Curators' }
        }
      ];
      return res.json({ items: demo, source: 'curated_demo', connected: false });
    }

    const data = await spotifyProvider.getUserPlaylists(token);
    res.json({
      items: (data.items || []).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        images: p.images,
        tracks: p.tracks,
        owner: p.owner
      })),
      source: 'spotify_api',
      connected: true
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Preview Spotify Playlist (Matched vs Unmatched breakdown)
router.post('/preview-playlist', async (req, res) => {
  try {
    const { urlOrId } = req.body;
    if (!urlOrId) return res.status(400).json({ error: 'urlOrId is required.' });

    const token = await getSpotifyToken();
    const playlistId = spotifyProvider.extractPlaylistId(urlOrId);
    const spPlaylist = await spotifyProvider.getPlaylist(playlistId, token);

    if (!spPlaylist) return res.status(404).json({ error: 'Playlist could not be loaded from Spotify.' });

    let matchedCount = 0;
    const previewTracks = [];

    for (const t of spPlaylist.tracks) {
      const matched = await syncService.fuzzyMatchFurinaCatalog(t.title, t.artist);
      if (matched) matchedCount++;
      previewTracks.push({
        ...t,
        matchedFurina: Boolean(matched),
        matchedTrackTitle: matched?.title || null
      });
    }

    res.json({
      id: spPlaylist.id,
      name: spPlaylist.name,
      description: spPlaylist.description,
      coverUrl: spPlaylist.coverUrl,
      totalTracks: spPlaylist.tracks.length,
      matchedTracksCount: matchedCount,
      unmatchedTracksCount: spPlaylist.tracks.length - matchedCount,
      tracks: previewTracks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Import Spotify Playlist
router.post('/import-playlist', async (req, res) => {
  try {
    const { urlOrId } = req.body;
    if (!urlOrId) return res.status(400).json({ error: 'urlOrId is required.' });

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const token = await getSpotifyToken();
    const playlistId = spotifyProvider.extractPlaylistId(urlOrId);

    const imported = await syncService.importSpotifyPlaylist(
      user?.id || 'user_furina_default',
      playlistId,
      token
    );

    res.status(201).json(imported);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Complete Spotify User Library Sync (All Playlists, Liked Songs, Top Tracks)
router.post('/sync-user-library', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const token = await getSpotifyToken();
    if (!token) {
      return res.status(401).json({ error: 'Spotify account not connected. Please connect via modal first.' });
    }

    const syncReport = await syncService.syncAllSpotifyUserData(user.id, token);
    res.json({
      success: true,
      message: `Successfully synchronized ${syncReport.playlistsImported} playlists, ${syncReport.likedSongsCount} liked songs, and ${syncReport.topTracksCount} top tracks!`,
      ...syncReport
    });
  } catch (err) {
    console.error('[SpotifyRoutes] User library sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Direct User Saved Tracks endpoint
router.get('/saved-tracks', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    if (!token) return res.status(401).json({ error: 'Not connected to Spotify' });
    const data = await spotifyProvider.getUserSavedTracks(token, 50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Direct User Top Tracks endpoint
router.get('/top-tracks', async (req, res) => {
  try {
    const token = await getSpotifyToken();
    if (!token) return res.status(401).json({ error: 'Not connected to Spotify' });
    const data = await spotifyProvider.getUserTopTracks(token, 50);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
