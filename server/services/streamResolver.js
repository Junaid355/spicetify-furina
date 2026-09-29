const deezerProvider = require('../providers/DeezerProvider');
const itunesProvider = require('../providers/iTunesProvider');

class StreamResolver {
  constructor() {
    this.cache = new Map();
  }

  async resolveAudioStream(title, artist) {
    if (!title) return null;
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/-\s*from.*/i, '').trim();
    const cleanArtist = (artist || '').split(',')[0].split('&')[0].trim();
    const cacheKey = `${cleanTitle}::${cleanArtist}`.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. Try Deezer (320kbps MP3)
    try {
      const dz = await deezerProvider.findAudioStream(cleanTitle, cleanArtist);
      if (dz?.streamUrl) {
        this.cache.set(cacheKey, dz);
        return dz;
      }
    } catch (_) {}

    // 2. Try Apple Music / iTunes (256kbps AAC)
    try {
      const it = await itunesProvider.findAudioStream(cleanTitle, cleanArtist);
      if (it?.streamUrl) {
        this.cache.set(cacheKey, it);
        return it;
      }
    } catch (_) {}

    return null;
  }
}

module.exports = new StreamResolver();
