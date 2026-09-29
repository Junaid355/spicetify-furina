const MusicProvider = require('./MusicProvider');

class DeezerProvider extends MusicProvider {
  constructor() {
    super('Deezer Music API', 'deezer');
    this.apiBase = 'https://api.deezer.com';
  }

  formatDeezerTrack(t) {
    if (!t) return null;
    return {
      id: `dz_${t.id}`,
      providerTrackId: String(t.id),
      title: t.title || t.title_short || 'Untitled Track',
      artist: t.artist?.name || 'Unknown Artist',
      album: t.album?.title || 'Single / Master',
      durationMs: (t.duration || 180) * 1000,
      coverUrl: t.album?.cover_big || t.album?.cover_medium || t.album?.cover || '/images/default_artwork.jpg',
      streamUrl: t.preview || null,
      provider: 'deezer',
      playbackType: 'deezer',
      isDownloadable: false,
      audioQuality: {
        codec: 'MP3',
        format: 'MPEG Audio Layer 3',
        bitrate: '320 kbps (Standard Web Preview)',
        sampleRate: '44.1 kHz',
        lossless: false,
        source: 'Deezer Music CDN'
      },
      lyricsAvailable: false,
      popularity: t.rank ? Math.min(100, Math.floor(t.rank / 10000)) : 75
    };
  }

  async search(query, limit = 25) {
    try {
      const url = `${this.apiBase}/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FurinaMusic/2.0' }
      });
      if (!res.ok) return { tracks: [], albums: [], artists: [] };
      const data = await res.json();
      const tracks = (data.data || []).map(t => this.formatDeezerTrack(t)).filter(Boolean);

      // Extract unique artists and albums from results
      const artistMap = new Map();
      const albumMap = new Map();

      for (const t of data.data || []) {
        if (t.artist && !artistMap.has(t.artist.id)) {
          artistMap.set(t.artist.id, {
            id: `dz_art_${t.artist.id}`,
            name: t.artist.name,
            imageUrl: t.artist.picture_big || t.artist.picture_medium || t.artist.picture,
            provider: 'deezer'
          });
        }
        if (t.album && !albumMap.has(t.album.id)) {
          albumMap.set(t.album.id, {
            id: `dz_alb_${t.album.id}`,
            title: t.album.title,
            artist: t.artist?.name,
            coverUrl: t.album.cover_big || t.album.cover_medium,
            provider: 'deezer'
          });
        }
      }

      return {
        provider: 'deezer',
        tracks,
        artists: Array.from(artistMap.values()).slice(0, 8),
        albums: Array.from(albumMap.values()).slice(0, 8)
      };
    } catch (err) {
      console.warn('[DeezerProvider] Search error:', err.message);
      return { tracks: [], albums: [], artists: [] };
    }
  }

  async getTopChart(limit = 30) {
    try {
      const url = `${this.apiBase}/chart/0/tracks?limit=${limit}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FurinaMusic/2.0' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.data || []).map(t => this.formatDeezerTrack(t)).filter(Boolean);
    } catch (err) {
      console.warn('[DeezerProvider] Chart fetch error:', err.message);
      return [];
    }
  }

  async getPlaylist(playlistId) {
    try {
      const cleanId = String(playlistId).replace(/\D/g, '');
      const url = `${this.apiBase}/playlist/${cleanId}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'FurinaMusic/2.0' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error) return null;

      const tracks = (data.tracks?.data || []).map(t => this.formatDeezerTrack(t)).filter(Boolean);
      return {
        id: `dz_pl_${data.id}`,
        name: data.title,
        description: data.description || 'Deezer Curated Playlist',
        coverUrl: data.picture_big || data.picture_medium || '/images/default_artwork.jpg',
        provider: 'deezer',
        owner: data.creator?.name || 'Deezer Curators',
        totalTracks: tracks.length,
        tracks
      };
    } catch (err) {
      console.warn('[DeezerProvider] Playlist fetch error:', err.message);
      return null;
    }
  }

  async findAudioStream(title, artist) {
    try {
      const q = encodeURIComponent(`${title} ${artist}`);
      const res = await fetch(`${this.apiBase}/search?q=${q}&limit=1`, {
        headers: { 'User-Agent': 'FurinaMusic/2.0' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.data && data.data[0] && data.data[0].preview) {
        return {
          streamUrl: data.data[0].preview,
          source: 'deezer',
          durationMs: (data.data[0].duration || 180) * 1000
        };
      }
    } catch (_) {}
    return null;
  }
}

module.exports = new DeezerProvider();
