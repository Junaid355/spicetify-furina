const MusicProvider = require('./MusicProvider');

class ITunesProvider extends MusicProvider {
  constructor() {
    super('Apple Music / iTunes API', 'apple');
    this.apiBase = 'https://itunes.apple.com';
  }

  formatITunesTrack(t) {
    if (!t) return null;
    const coverRaw = t.artworkUrl100 || t.artworkUrl60 || '/images/default_artwork.jpg';
    // Upgrade to high-res 1000x1000 artwork
    const coverHiRes = coverRaw.replace(/100x100bb/, '1000x1000bb').replace(/60x60bb/, '600x600bb');

    return {
      id: `it_${t.trackId}`,
      providerTrackId: String(t.trackId),
      title: t.trackName || t.trackCensoredName || 'Untitled Track',
      artist: t.artistName || 'Unknown Artist',
      album: t.collectionName || 'Single Master',
      durationMs: t.trackTimeMillis || 180000,
      coverUrl: coverHiRes,
      streamUrl: t.previewUrl || null,
      provider: 'apple',
      playbackType: 'apple',
      isDownloadable: false,
      audioQuality: {
        codec: 'AAC',
        format: 'Advanced Audio Coding (Apple Lossless Source)',
        bitrate: '256 kbps (AAC Web Preview)',
        sampleRate: '44.1 kHz',
        lossless: false,
        source: 'Apple Music CDN'
      },
      lyricsAvailable: false,
      popularity: 85
    };
  }

  async search(query, limit = 25) {
    try {
      const url = `${this.apiBase}/search?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`;
      const res = await fetch(url);
      if (!res.ok) return { tracks: [], albums: [], artists: [] };
      const data = await res.json();
      const tracks = (data.results || []).map(t => this.formatITunesTrack(t)).filter(Boolean);

      const artistMap = new Map();
      const albumMap = new Map();

      for (const t of data.results || []) {
        if (t.artistId && !artistMap.has(t.artistId)) {
          artistMap.set(t.artistId, {
            id: `it_art_${t.artistId}`,
            name: t.artistName,
            imageUrl: t.artworkUrl100 ? t.artworkUrl100.replace(/100x100bb/, '600x600bb') : '/images/furina_salon_music.jpg',
            provider: 'apple'
          });
        }
        if (t.collectionId && !albumMap.has(t.collectionId)) {
          albumMap.set(t.collectionId, {
            id: `it_alb_${t.collectionId}`,
            title: t.collectionName,
            artist: t.artistName,
            coverUrl: t.artworkUrl100 ? t.artworkUrl100.replace(/100x100bb/, '1000x1000bb') : '/images/default_artwork.jpg',
            provider: 'apple'
          });
        }
      }

      return {
        provider: 'apple',
        tracks,
        artists: Array.from(artistMap.values()).slice(0, 8),
        albums: Array.from(albumMap.values()).slice(0, 8)
      };
    } catch (err) {
      console.warn('[ITunesProvider] Search error:', err.message);
      return { tracks: [], albums: [], artists: [] };
    }
  }

  async findAudioStream(title, artist) {
    try {
      const q = encodeURIComponent(`${title} ${artist}`);
      const res = await fetch(`${this.apiBase}/search?term=${q}&entity=song&limit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results[0] && data.results[0].previewUrl) {
        return {
          streamUrl: data.results[0].previewUrl,
          source: 'apple',
          durationMs: data.results[0].trackTimeMillis || 180000
        };
      }
    } catch (_) {}
    return null;
  }
}

module.exports = new ITunesProvider();
