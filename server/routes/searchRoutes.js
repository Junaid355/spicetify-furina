const express = require('express');
const router = express.Router();
const furinaProvider = require('../providers/FurinaCatalogProvider');
const spotifyProvider = require('../providers/SpotifyProvider');
const deezerProvider = require('../providers/DeezerProvider');
const itunesProvider = require('../providers/iTunesProvider');
const db = require('../db/database');

// Unified Federated Multi-Source Search (Spotify, Deezer, Apple Music, Fontaine)
router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    const sourceFilter = (req.query.source || 'all').toLowerCase();

    if (!query.trim()) {
      return res.json({
        query: '',
        results: {
          allTracks: [],
          furina: { tracks: [], artists: [], albums: [] },
          spotify: { tracks: [], artists: [], albums: [] },
          deezer: { tracks: [], artists: [], albums: [] },
          apple: { tracks: [], artists: [], albums: [] }
        }
      });
    }

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const spAccount = await db.queryGet(`SELECT access_token FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user?.id]);

    // Query all music providers in parallel
    const [furinaRes, deezerRes, itunesRes, spotifyRes] = await Promise.allSettled([
      sourceFilter === 'all' || sourceFilter === 'furina' ? furinaProvider.search(query, 10) : Promise.resolve({ tracks: [], artists: [], albums: [] }),
      sourceFilter === 'all' || sourceFilter === 'deezer' ? deezerProvider.search(query, 15) : Promise.resolve({ tracks: [], artists: [], albums: [] }),
      sourceFilter === 'all' || sourceFilter === 'apple' ? itunesProvider.search(query, 15) : Promise.resolve({ tracks: [], artists: [], albums: [] }),
      sourceFilter === 'all' || sourceFilter === 'spotify' ? spotifyProvider.search(query, 15, spAccount?.access_token || null) : Promise.resolve({ tracks: [], artists: [], albums: [] })
    ]);

    const furina = furinaRes.status === 'fulfilled' ? furinaRes.value : { tracks: [], artists: [], albums: [] };
    const deezer = deezerRes.status === 'fulfilled' ? deezerRes.value : { tracks: [], artists: [], albums: [] };
    const apple = itunesRes.status === 'fulfilled' ? itunesRes.value : { tracks: [], artists: [], albums: [] };
    const spotify = spotifyRes.status === 'fulfilled' ? spotifyRes.value : { tracks: [], artists: [], albums: [] };

    // Interleave tracks for a balanced rich federated discovery experience
    const allTracks = [];
    const maxLen = Math.max(furina.tracks.length, deezer.tracks.length, apple.tracks.length, spotify.tracks.length);

    for (let i = 0; i < maxLen; i++) {
      if (furina.tracks[i]) allTracks.push(furina.tracks[i]);
      if (deezer.tracks[i]) allTracks.push(deezer.tracks[i]);
      if (apple.tracks[i]) allTracks.push(apple.tracks[i]);
      if (spotify.tracks[i]) allTracks.push(spotify.tracks[i]);
    }

    res.json({
      query,
      sourceFilter,
      results: {
        allTracks,
        furina,
        deezer,
        apple,
        spotify
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
