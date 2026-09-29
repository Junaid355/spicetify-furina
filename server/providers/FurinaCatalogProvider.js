const MusicProvider = require('./MusicProvider');
const db = require('../db/database');

class FurinaCatalogProvider extends MusicProvider {
  constructor() {
    super('Furina Authorized Catalog', 'furina');
  }

  async getTrack(trackId) {
    const row = await db.queryGet(`
      SELECT t.*, l.lrc_text, l.is_synced
      FROM tracks t
      LEFT JOIN lyrics l ON t.id = l.track_id
      WHERE t.id = ? AND t.provider = 'furina'
    `, [trackId]);
    return row ? this.formatTrack(row) : null;
  }

  async search(query, limit = 20) {
    const term = `%${query.trim()}%`;
    const tracks = await db.queryAll(`
      SELECT * FROM tracks
      WHERE (title LIKE ? OR artist LIKE ? OR album LIKE ?) AND provider = 'furina'
      LIMIT ?
    `, [term, term, term, limit]);

    const artists = await db.queryAll(`
      SELECT * FROM artists
      WHERE name LIKE ? AND provider = 'furina'
      LIMIT ?
    `, [term, limit]);

    const albums = await db.queryAll(`
      SELECT * FROM albums
      WHERE title LIKE ? AND provider = 'furina'
      LIMIT ?
    `, [term, limit]);

    return {
      provider: this.code,
      tracks: tracks.map(t => this.formatTrack(t)),
      artists,
      albums
    };
  }

  async getAlbum(albumId) {
    const album = await db.queryGet(`SELECT * FROM albums WHERE id = ?`, [albumId]);
    if (!album) return null;
    const tracks = await db.queryAll(`
      SELECT * FROM tracks WHERE album = ? AND provider = 'furina' ORDER BY id ASC
    `, [album.title]);
    return {
      ...album,
      tracks: tracks.map(t => this.formatTrack(t))
    };
  }

  async getArtist(artistId) {
    const artist = await db.queryGet(`SELECT * FROM artists WHERE id = ?`, [artistId]);
    if (!artist) return null;
    const tracks = await db.queryAll(`
      SELECT * FROM tracks WHERE artist = ? AND provider = 'furina' ORDER BY popularity DESC
    `, [artist.name]);
    const albums = await db.queryAll(`
      SELECT * FROM albums WHERE artist_name = ?
    `, [artist.name]);
    return {
      ...artist,
      tracks: tracks.map(t => this.formatTrack(t)),
      albums
    };
  }

  async getPlaylist(playlistId) {
    const playlist = await db.queryGet(`SELECT * FROM playlists WHERE id = ?`, [playlistId]);
    if (!playlist) return null;
    const tracks = await db.queryAll(`
      SELECT t.*, pt.position
      FROM playlist_tracks pt
      JOIN tracks t ON pt.track_id = t.id
      WHERE pt.playlist_id = ?
      ORDER BY pt.position ASC
    `, [playlistId]);
    return {
      ...playlist,
      tracks: tracks.map(t => this.formatTrack(t))
    };
  }

  canStream(track) {
    return true;
  }

  canDownload(track) {
    return Boolean(track.is_downloadable);
  }

  async getStreamUrl(track) {
    return track.stream_url;
  }

  async getAudioQuality(track) {
    return {
      codec: track.codec || 'PCM Lossless WAV',
      bitrate: track.bitrate || '1411 kbps',
      sampleRate: track.sample_rate || '44.1 kHz',
      bitDepth: '16-bit Stereo',
      source: 'Furina High-Fidelity Master',
      licensed: true
    };
  }

  async getLyrics(trackId) {
    return await db.queryGet(`
      SELECT lrc_text, plain_text, is_synced, source
      FROM lyrics
      WHERE track_id = ?
    `, [trackId]);
  }

  formatTrack(row) {
    return {
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      durationMs: row.duration_ms,
      coverUrl: row.cover_url,
      streamUrl: row.stream_url,
      provider: 'furina',
      providerTrackId: row.provider_track_id,
      playbackType: 'furina',
      isDownloadable: true,
      audioQuality: {
        codec: row.codec || 'PCM Lossless WAV',
        bitrate: row.bitrate || '1411 kbps',
        sampleRate: row.sample_rate || '44.1 kHz',
        source: 'Furina Authorized Catalog'
      },
      lyricsAvailable: Boolean(row.lyrics_available),
      popularity: row.popularity
    };
  }
}

module.exports = new FurinaCatalogProvider();
