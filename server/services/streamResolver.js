const deezerProvider = require('../providers/DeezerProvider');
const itunesProvider = require('../providers/iTunesProvider');

class StreamResolver {
  constructor() {
    this.cache = new Map();
  }

  async resolveAudioStream(title, artist) {
    if (!title) return null;
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/-\s*from.*/i, '').trim();
    const cleanArtist = (artist || '').replace(/\u00a0/g, ' ').split(/[,&]/)[0].trim();
    const cacheKey = `${cleanTitle}::${cleanArtist}`.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. YouTube Full-Length Audio Streamer Resolver (100% Full Song, No 30s Cap)
    try {
      const q = `${cleanTitle} ${cleanArtist}`;
      const ytRes = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });
      if (ytRes.ok) {
        const html = await ytRes.text();
        const match = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (match && match[1]) {
          const result = {
            videoId: match[1],
            youtubeId: match[1],
            streamType: 'youtube',
            fullLength: true,
            provider: 'youtube',
            title: cleanTitle,
            artist: cleanArtist
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_) {}

    // 2. Try Deezer (320kbps MP3 preview)
    try {
      const dz = await deezerProvider.findAudioStream(cleanTitle, cleanArtist);
      if (dz?.streamUrl) {
        this.cache.set(cacheKey, dz);
        return dz;
      }
    } catch (_) {}

    // 3. Try Apple Music / iTunes (256kbps AAC preview)
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
