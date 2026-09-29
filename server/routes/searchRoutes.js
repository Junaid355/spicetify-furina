const express = require('express');
const router = express.Router();
const furinaProvider = require('../providers/FurinaCatalogProvider');
const spotifyProvider = require('../providers/SpotifyProvider');
const db = require('../db/database');

// Unified Federated Search
router.get('/', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) {
      return res.json({
        query: '',
        furina: { tracks: [], artists: [], albums: [] },
        spotify: { tracks: [], artists: [], albums: [] }
      });
    }

    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const spAccount = await db.queryGet(`SELECT access_token FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user?.id]);

    // Query both providers concurrently
    const [furinaResults, spotifyResults] = await Promise.all([
      furinaProvider.search(query, 10),
      spotifyProvider.search(query, 10, spAccount?.access_token || null)
    ]);

    res.json({
      query,
      results: {
        allTracks: [
          ...furinaResults.tracks,
          ...spotifyResults.tracks
        ],
        furina: furinaResults,
        spotify: spotifyResults
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
