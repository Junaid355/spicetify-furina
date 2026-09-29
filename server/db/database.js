const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'furina.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(DB_PATH, async (err) => {
        if (err) {
          console.error('[DB] Connection error:', err);
          return reject(err);
        }
        console.log('[DB] Connected to SQLite database at:', DB_PATH);
        try {
          await this.applySchema();
          await this.seedInitialData();
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  }

  async applySchema() {
    const schemaSql = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    return new Promise((resolve, reject) => {
      this.db.exec(schemaSql, (err) => {
        if (err) {
          console.error('[DB] Schema application failed:', err);
          return reject(err);
        }
        console.log('[DB] Schema applied successfully.');
        resolve();
      });
    });
  }

  // Promise wrappers
  queryAll(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows || []);
      });
    });
  }

  queryGet(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }

  queryRun(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async seedInitialData() {
    // 1. Providers
    const providers = [
      { id: 'prov_furina', name: 'Furina Authorized Catalog', code: 'furina', is_active: 1, supports_streaming: 1, supports_download: 1, supports_lyrics: 1 },
      { id: 'prov_spotify', name: 'Spotify Official API', code: 'spotify', is_active: 1, supports_streaming: 1, supports_download: 0, supports_lyrics: 1 },
      { id: 'prov_licensed', name: 'Licensed Fontaine Archive', code: 'licensed', is_active: 1, supports_streaming: 1, supports_download: 1, supports_lyrics: 1 }
    ];

    for (const p of providers) {
      await this.queryRun(`
        INSERT INTO providers (id, name, code, is_active, supports_streaming, supports_download, supports_lyrics)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(code) DO UPDATE SET name=excluded.name, is_active=excluded.is_active
      `, [p.id, p.name, p.code, p.is_active, p.supports_streaming, p.supports_download, p.supports_lyrics]);
    }

    // 2. Default Guest/Admin User
    await this.queryRun(`
      INSERT INTO users (id, username, email, password_hash, display_name, avatar_url, role)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(username) DO UPDATE SET display_name=excluded.display_name, avatar_url=excluded.avatar_url
    `, [
      'user_furina_default',
      'furina_listener',
      'listener@furina.music',
      'argon2_hash_placeholder_furina_secure',
      'Lady Furina',
      '/images/furina_pure_hydro.jpg',
      'admin'
    ]);

    // 3. Artists
    const artists = [
      { id: 'art_furina', name: 'Furina de Fontaine', bio: 'The Regina of All Waters, Kindreds, Peoples and Laws. Star of the Opera Epiclese.', image_url: '/images/furina_pure_hydro.jpg' },
      { id: 'art_salon', name: 'Salon Solitaire Ensemble', bio: 'Gentilhomme Usher, Surintendante Chevalmarin, and Mademoiselle Crabaletta.', image_url: '/images/furina_salon_music.jpg' },
      { id: 'art_orchestra', name: 'Fontaine Philharmonic Orchestra', bio: 'Grand orchestral ensemble performing across the Court of Fontaine.', image_url: '/images/furina_ocean_abyss.jpg' }
    ];

    for (const a of artists) {
      await this.queryRun(`
        INSERT INTO artists (id, name, bio, image_url, provider)
        VALUES (?, ?, ?, ?, 'furina')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, image_url=excluded.image_url
      `, [a.id, a.name, a.bio, a.image_url]);
    }

    // 4. Albums
    const albums = [
      { id: 'alb_vaguelette', title: 'La Vaguelette — Fontaine Opera Suites', artist_id: 'art_furina', artist_name: 'Furina de Fontaine', release_date: '2023-11-08', cover_url: '/images/furina_opera_tears.jpg', genre: 'Symphonic Opera', total_tracks: 3 },
      { id: 'alb_solitaire', title: 'Hydro Solitaire & Court Minuets', artist_id: 'art_salon', artist_name: 'Salon Solitaire Ensemble', release_date: '2023-12-20', cover_url: '/images/furina_salon_music.jpg', genre: 'Baroque Chamber', total_tracks: 2 },
      { id: 'alb_stage', title: "All The World's A Stage", artist_id: 'art_orchestra', artist_name: 'Fontaine Philharmonic Orchestra', release_date: '2024-01-15', cover_url: '/images/furina_ocean_abyss.jpg', genre: 'Orchestral Grandeur', total_tracks: 2 }
    ];

    for (const alb of albums) {
      await this.queryRun(`
        INSERT INTO albums (id, title, artist_id, artist_name, release_date, cover_url, genre, total_tracks, provider)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'furina')
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, cover_url=excluded.cover_url
      `, [alb.id, alb.title, alb.artist_id, alb.artist_name, alb.release_date, alb.cover_url, alb.genre, alb.total_tracks]);
    }

    // 5. Tracks (Furina Authorized Catalog)
    const tracks = [
      {
        id: 'furina_vaguelette',
        title: 'La Vaguelette',
        artist: 'Furina de Fontaine',
        album: 'La Vaguelette — Fontaine Opera Suites',
        duration_ms: 180000,
        cover_url: '/images/furina_opera_tears.jpg',
        stream_url: '/audio/la_vaguelette.wav',
        provider: 'furina',
        provider_track_id: 'furina_001',
        playback_type: 'furina',
        is_downloadable: 1,
        codec: 'PCM Lossless WAV',
        bitrate: '1411 kbps',
        sample_rate: '44.1 kHz',
        lyrics_available: 1,
        popularity: 99
      },
      {
        id: 'furina_hydro_solitaire',
        title: 'Hydro Solitaire',
        artist: 'Salon Solitaire Ensemble',
        album: 'Hydro Solitaire & Court Minuets',
        duration_ms: 172000,
        cover_url: '/images/furina_salon_music.jpg',
        stream_url: '/audio/hydro_solitaire.wav',
        provider: 'furina',
        provider_track_id: 'furina_002',
        playback_type: 'furina',
        is_downloadable: 1,
        codec: 'PCM Lossless WAV',
        bitrate: '1411 kbps',
        sample_rate: '44.1 kHz',
        lyrics_available: 1,
        popularity: 94
      },
      {
        id: 'furina_fontaine_waltz',
        title: 'Fontaine Waltz',
        artist: 'Fontaine Philharmonic Orchestra',
        album: "All The World's A Stage",
        duration_ms: 165000,
        cover_url: '/images/furina_ocean_abyss.jpg',
        stream_url: '/audio/fontaine_waltz.wav',
        provider: 'furina',
        provider_track_id: 'furina_003',
        playback_type: 'furina',
        is_downloadable: 1,
        codec: 'PCM Lossless WAV',
        bitrate: '1411 kbps',
        sample_rate: '44.1 kHz',
        lyrics_available: 1,
        popularity: 91
      },
      {
        id: 'furina_stage_glory',
        title: "All The World's A Stage",
        artist: 'Furina de Fontaine',
        album: "All The World's A Stage",
        duration_ms: 195000,
        cover_url: '/images/furina_pure_hydro.jpg',
        stream_url: '/audio/fontaine_waltz.wav',
        provider: 'furina',
        provider_track_id: 'furina_004',
        playback_type: 'furina',
        is_downloadable: 1,
        codec: 'PCM Lossless WAV',
        bitrate: '1411 kbps',
        sample_rate: '44.1 kHz',
        lyrics_available: 1,
        popularity: 96
      },
      {
        id: 'furina_melancholy_tears',
        title: 'Tears of the Hydro Archon',
        artist: 'Furina de Fontaine',
        album: 'La Vaguelette — Fontaine Opera Suites',
        duration_ms: 154000,
        cover_url: '/images/furina_melancholy_swing.jpg',
        stream_url: '/audio/la_vaguelette.wav',
        provider: 'furina',
        provider_track_id: 'furina_005',
        playback_type: 'furina',
        is_downloadable: 1,
        codec: 'PCM Lossless WAV',
        bitrate: '1411 kbps',
        sample_rate: '44.1 kHz',
        lyrics_available: 1,
        popularity: 88
      }
    ];

    for (const t of tracks) {
      await this.queryRun(`
        INSERT INTO tracks (id, title, artist, album, duration_ms, cover_url, stream_url, provider, provider_track_id, playback_type, is_downloadable, codec, bitrate, sample_rate, lyrics_available, popularity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title=excluded.title, cover_url=excluded.cover_url, stream_url=excluded.stream_url
      `, [t.id, t.title, t.artist, t.album, t.duration_ms, t.cover_url, t.stream_url, t.provider, t.provider_track_id, t.playback_type, t.is_downloadable, t.codec, t.bitrate, t.sample_rate, t.lyrics_available, t.popularity]);

      await this.queryRun(`
        INSERT INTO provider_tracks (id, track_id, provider, provider_track_id, is_matched)
        VALUES (?, ?, 'furina', ?, 1)
        ON CONFLICT(provider, provider_track_id) DO NOTHING
      `, [`pt_${t.id}`, t.id, t.provider_track_id]);
    }

    // 6. Lyrics with accurate LRC timestamps
    const lrcLaVaguelette = `[00:00.00]Ah, si je pouvais vivre dans l'eau
[00:09.50]Le monde serait si beau
[00:19.00]Une larme coule sur mon visage
[00:28.50]Reflet d'un lointain mirage
[00:38.00]Au tribunal de l'opéra
[00:47.50]Le rideau bleu se lèvera
[00:57.00]Sous la lumière des projecteurs
[01:06.50]Je cache au fond toute ma douleur
[01:16.00]Danse, petite vaguelette, danse
[01:25.50]Au gré du vent et du silence
[01:35.00]La marée monte lentement
[01:44.50]Effaçant le serment des amants
[01:54.00]Fontaine chantera pour toujours
[02:03.50]L'écho de cet immortel amour`;

    await this.queryRun(`
      INSERT INTO lyrics (id, track_id, lrc_text, plain_text, is_synced)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(track_id) DO UPDATE SET lrc_text=excluded.lrc_text
    `, ['lyr_vaguelette', 'furina_vaguelette', lrcLaVaguelette, lrcLaVaguelette.replace(/\[\d+:\d+\.\d+\]/g, '')]);

    const lrcSolitaire = `[00:00.00]Gentilhomme Usher stands at attention
[00:12.00]The court gathers in grand ascension
[00:24.00]Surintendante Chevalmarin takes the lead
[00:36.00]Hydro currents whisper through every reed
[00:48.00]Mademoiselle Crabaletta begins the pirouette
[01:00.00]A courtly waltz you shall never forget
[01:12.00]Through droplets of crystal and waves of glass
[01:24.00]Five hundred years of grandeur shall pass
[01:36.00]Raise the glass to the stage divine
[01:48.00]Under Fontaine's eternal royal shine`;

    await this.queryRun(`
      INSERT INTO lyrics (id, track_id, lrc_text, plain_text, is_synced)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(track_id) DO UPDATE SET lrc_text=excluded.lrc_text
    `, ['lyr_solitaire', 'furina_hydro_solitaire', lrcSolitaire, lrcSolitaire.replace(/\[\d+:\d+\.\d+\]/g, '')]);

    // 7. Seed Playlists
    const curatedPlaylists = [
      {
        id: 'pl_opera_epiclese',
        name: 'Opera Epiclese: Grand Repertoire',
        description: 'The definitive collection of Fontaine theatrical movements and royal suites, curated by Furina.',
        cover_url: '/images/furina_opera_tears.jpg',
        tracks: ['furina_vaguelette', 'furina_stage_glory', 'furina_melancholy_tears']
      },
      {
        id: 'pl_salon_tea',
        name: 'Salon Solitaire Afternoon High Tea',
        description: 'Refined baroque minuets and spirited waltzes for relaxation and graceful afternoon reflection.',
        cover_url: '/images/furina_salon_music.jpg',
        tracks: ['furina_hydro_solitaire', 'furina_fontaine_waltz']
      },
      {
        id: 'pl_fontaine_abyss',
        name: 'Fontaine Submerged Memories',
        description: 'Luminous underwater ambient harmonies echoing through the Primordial Sea.',
        cover_url: '/images/furina_ocean_abyss.jpg',
        tracks: ['furina_vaguelette', 'furina_melancholy_tears', 'furina_fontaine_waltz']
      }
    ];

    for (const pl of curatedPlaylists) {
      await this.queryRun(`
        INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, provider, is_imported, sync_status)
        VALUES (?, 'user_furina_default', ?, ?, ?, 1, 'furina', 0, 'synced')
        ON CONFLICT(id) DO UPDATE SET name=excluded.name, description=excluded.description, cover_url=excluded.cover_url
      `, [pl.id, pl.name, pl.description, pl.cover_url]);

      let pos = 0;
      for (const trackId of pl.tracks) {
        await this.queryRun(`
          INSERT INTO playlist_tracks (id, playlist_id, track_id, position)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(playlist_id, track_id) DO UPDATE SET position=excluded.position
        `, [`${pl.id}_${trackId}`, pl.id, trackId, pos++]);
      }
    }

    // 8. Seed default likes
    await this.queryRun(`
      INSERT INTO likes (id, user_id, track_id)
      VALUES ('like_vaguelette', 'user_furina_default', 'furina_vaguelette')
      ON CONFLICT(user_id, track_id) DO NOTHING
    `);
    await this.queryRun(`
      INSERT INTO likes (id, user_id, track_id)
      VALUES ('like_solitaire', 'user_furina_default', 'furina_hydro_solitaire')
      ON CONFLICT(user_id, track_id) DO NOTHING
    `);

    // 9. Charts
    const chartTracks = [
      { id: 'chart_1', rank: 1, track_id: 'furina_vaguelette', prev: 1 },
      { id: 'chart_2', rank: 2, track_id: 'furina_stage_glory', prev: 3 },
      { id: 'chart_3', rank: 3, track_id: 'furina_hydro_solitaire', prev: 2 },
      { id: 'chart_4', rank: 4, track_id: 'furina_fontaine_waltz', prev: 5 },
      { id: 'chart_5', rank: 5, track_id: 'furina_melancholy_tears', prev: 4 }
    ];
    for (const c of chartTracks) {
      await this.queryRun(`
        INSERT INTO charts (id, chart_name, track_id, rank, previous_rank, region)
        VALUES (?, 'Fontaine Epiclese Top 50', ?, ?, ?, 'Fontaine')
        ON CONFLICT(id) DO UPDATE SET rank=excluded.rank
      `, [c.id, c.track_id, c.rank, c.prev]);
    }

    // 10. Default Settings
    const defaultSettings = [
      { cat: 'appearance', k: 'theme', v: 'furina-fontaine' },
      { cat: 'appearance', k: 'accent', v: '#38bdf8' },
      { cat: 'appearance', k: 'animations', v: 'high' },
      { cat: 'playback', k: 'quality', v: 'Lossless (WAV/FLAC)' },
      { cat: 'playback', k: 'autoplay', v: 'true' },
      { cat: 'playback', k: 'crossfade', v: '3' },
      { cat: 'playback', k: 'normalization', v: 'true' },
      { cat: 'downloads', k: 'quality', v: 'High (PCM WAV)' },
      { cat: 'downloads', k: 'wifiOnly', v: 'false' },
      { cat: 'privacy', k: 'recommendations', v: 'true' },
      { cat: 'privacy', k: 'publicProfile', v: 'true' }
    ];
    for (const s of defaultSettings) {
      await this.queryRun(`
        INSERT INTO settings (id, user_id, category, key, value)
        VALUES (?, 'user_furina_default', ?, ?, ?)
        ON CONFLICT(user_id, category, key) DO UPDATE SET value=excluded.value
      `, [`set_${s.cat}_${s.k}`, s.cat, s.k, s.v]);
    }

    console.log('[DB] Seeding completed successfully.');
  }
}

const dbManager = new DatabaseManager();

module.exports = dbManager;
