const db = require('../db/database');
const furinaProvider = require('../providers/FurinaCatalogProvider');

class RecommendationService {
  async getHomeFeed(userId) {
    // 1. Trending Fontaine tracks
    const trendingTracks = await db.queryAll(`
      SELECT * FROM tracks WHERE provider = 'furina' ORDER BY popularity DESC LIMIT 6
    `);

    // 2. Curated & User Playlists
    const playlists = await db.queryAll(`
      SELECT p.*, COUNT(pt.track_id) as track_count
      FROM playlists p
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id
      WHERE p.user_id = ? OR p.is_public = 1
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT 10
    `, [userId]);

    // 3. Fontaine Artists
    const artists = await db.queryAll(`SELECT * FROM artists LIMIT 6`);

    // 4. Fontaine Albums
    const albums = await db.queryAll(`SELECT * FROM albums LIMIT 6`);

    // 5. Epiclese Charts Top 5
    const charts = await db.queryAll(`
      SELECT c.rank, c.previous_rank, c.chart_name, t.*
      FROM charts c
      JOIN tracks t ON c.track_id = t.id
      ORDER BY c.rank ASC
      LIMIT 5
    `);

    // 6. Fontaine Mood Presets
    const moods = [
      { id: 'mood_opera', name: 'Grand Fontaine Opera', color: 'from-blue-900 to-indigo-950', description: 'Dramatic soprano suites and court overtures', icon: '🎭' },
      { id: 'mood_waltz', name: 'Salon Tea & Waltz', color: 'from-cyan-900 to-teal-950', description: 'Graceful court minuets with Gentilhomme Usher', icon: '☕' },
      { id: 'mood_abyss', name: 'Primordial Ocean Depths', color: 'from-slate-900 to-blue-950', description: 'Submerged serenity and ambient harp resonances', icon: '🌊' },
      { id: 'mood_judgment', name: 'The Oratrice Melodrama', color: 'from-purple-900 to-violet-950', description: 'High-stakes judgment fanfares and orchestral climaxes', icon: '⚖️' }
    ];

    // 7. Live Global Trending Chart (Multi-Source API)
    let globalTrending = [];
    try {
      const deezerProvider = require('../providers/DeezerProvider');
      globalTrending = await deezerProvider.getTopChart(12);
    } catch (_) {}

    return {
      hero: {
        title: "All The World's A Stage",
        subtitle: "Immerse in the grand Fontaine Opera Epiclese repertoire with high-fidelity lossless streaming.",
        badge: "✦ Regina of All Waters",
        image: "/images/furina_ocean_abyss.jpg",
        actionTrackId: "furina_vaguelette"
      },
      trending: trendingTracks.map(t => furinaProvider.formatTrack(t)),
      globalTrending,
      playlists,
      artists,
      albums,
      charts: charts.map(c => ({
        rank: c.rank,
        previousRank: c.previous_rank,
        chartName: c.chart_name,
        track: furinaProvider.formatTrack(c)
      })),
      moods
    };
  }

  async getMoodTracks(moodId) {
    // Return tracks fitting the Fontaine mood category
    const tracks = await db.queryAll(`SELECT * FROM tracks ORDER BY RANDOM() LIMIT 5`);
    return tracks.map(t => furinaProvider.formatTrack(t));
  }
}

module.exports = new RecommendationService();
