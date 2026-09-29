const express = require('express');
const router = express.Router();
const furinaProvider = require('../providers/FurinaCatalogProvider');
const spotifyProvider = require('../providers/SpotifyProvider');
const recommendationService = require('../services/recommendationService');
const db = require('../db/database');

// Home feed
router.get('/home', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const feed = await recommendationService.getHomeFeed(user?.id || 'user_furina_default');
    res.json(feed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Single track details
router.get('/tracks/:id', async (req, res) => {
  try {
    const trackId = req.params.id;
    if (trackId.startsWith('spotify_')) {
      const spId = trackId.replace('spotify_', '');
      const track = await spotifyProvider.getTrack(spId);
      return res.json(track);
    }
    const track = await furinaProvider.getTrack(trackId);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lyrics endpoint
router.get('/tracks/:id/lyrics', async (req, res) => {
  try {
    const trackId = req.params.id;
    const lyrics = await furinaProvider.getLyrics(trackId);
    if (!lyrics) {
      return res.json({
        available: false,
        is_synced: 0,
        plain_text: 'No synchronized lyrics available for this track.'
      });
    }
    res.json({
      available: true,
      ...lyrics
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real audio quality inspector endpoint (Section 14: Codec, Bitrate, Sample Rate, Source)
router.get('/tracks/:id/quality', async (req, res) => {
  try {
    const trackId = req.params.id;
    if (trackId.startsWith('spotify_')) {
      return res.json(await spotifyProvider.getAudioQuality({ id: trackId }));
    }
    const track = await furinaProvider.getTrack(trackId);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    const quality = await furinaProvider.getAudioQuality(track);
    res.json(quality);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Artists
router.get('/artists', async (req, res) => {
  try {
    const artists = await db.queryAll(`SELECT * FROM artists`);
    res.json(artists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/artists/:id', async (req, res) => {
  try {
    const artist = await furinaProvider.getArtist(req.params.id);
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Albums
router.get('/albums', async (req, res) => {
  try {
    const albums = await db.queryAll(`SELECT * FROM albums`);
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/albums/:id', async (req, res) => {
  try {
    const album = await furinaProvider.getAlbum(req.params.id);
    if (!album) return res.status(404).json({ error: 'Album not found' });
    res.json(album);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Charts
router.get('/charts', async (req, res) => {
  try {
    const charts = await db.queryAll(`
      SELECT c.rank, c.previous_rank, c.chart_name, t.*
      FROM charts c
      JOIN tracks t ON c.track_id = t.id
      ORDER BY c.rank ASC
    `);
    res.json(charts.map(c => ({
      rank: c.rank,
      previousRank: c.previous_rank,
      chartName: c.chart_name,
      track: furinaProvider.formatTrack(c)
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moods
router.get('/moods/:id', async (req, res) => {
  try {
    const tracks = await recommendationService.getMoodTracks(req.params.id);
    res.json({ moodId: req.params.id, tracks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Live Global Multi-Source Charts (Deezer + Apple + Spotify)
router.get('/global-charts', async (req, res) => {
  try {
    const deezerProvider = require('../providers/DeezerProvider');
    const limit = parseInt(req.query.limit, 10) || 25;
    const tracks = await deezerProvider.getTopChart(limit);
    res.json({
      chartName: 'Global Top Trending Hits',
      updatedAt: new Date().toISOString(),
      provider: 'deezer_global',
      tracks
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-Time Audio Stream Resolver for Any Track
router.get('/resolve-audio', async (req, res) => {
  try {
    const { title, artist } = req.query;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const streamResolver = require('../services/streamResolver');
    const stream = await streamResolver.resolveAudioStream(title, artist || '');
    if (!stream) {
      return res.status(404).json({ error: 'No audio stream available' });
    }
    res.json(stream);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
