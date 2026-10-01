const fs = require('fs');
const path = require('path');
const deezerProvider = require('../providers/DeezerProvider');
const itunesProvider = require('../providers/iTunesProvider');

class StreamResolver {
  constructor() {
    this.cache = new Map();
    this.videoMap = {};
    this.loadVideoMap();
  }

  loadVideoMap() {
    try {
      const vmapPath = path.join(__dirname, '../../public/data/video-map.json');
      if (fs.existsSync(vmapPath)) {
        this.videoMap = JSON.parse(fs.readFileSync(vmapPath, 'utf8'));
      }
    } catch (_) {}
  }

  async resolveAudioStream(title, artist) {
    if (!title) return null;
    const cleanTitle = title.replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/-\s*from.*/i, '').trim();
    const cleanArtist = (artist || '').replace(/\u00a0/g, ' ').split(/[,&]/)[0].trim();
    const cacheKey = `${cleanTitle}::${cleanArtist}`.toLowerCase();

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 0. Instant videoMap pre-check
    const lowTitle = cleanTitle.toLowerCase();
    const fullKey = `${lowTitle} - ${cleanArtist.toLowerCase()}`;
    const vidFromMap = this.videoMap[fullKey] || this.videoMap[lowTitle] || this.videoMap[title.toLowerCase().trim()];
    if (vidFromMap) {
      const result = {
        videoId: vidFromMap,
        youtubeId: vidFromMap,
        streamType: 'youtube',
        fullLength: true,
        provider: 'youtube',
        title: cleanTitle,
        artist: cleanArtist
      };
      this.cache.set(cacheKey, result);
      return result;
    }

    // 1. YouTube Full-Length Audio Streamer Resolver (100% Full Song, No 30s Cap)
    try {
      const q = `${cleanTitle} ${cleanArtist}`;
      const ytRes = await fetch('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        signal: AbortSignal.timeout(4500)
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

    // 2. Try Audius Full-Length Audio Stream (100% Full Song, No 30s preview)
    try {
      const q = `${cleanTitle} ${cleanArtist}`.trim();
      const audRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${encodeURIComponent(q)}&app_name=FURINA_MUSIC`, {
        signal: AbortSignal.timeout(3500)
      });
      if (audRes.ok) {
        const audData = await audRes.json();
        const match = audData.data?.[0];
        if (match && match.id) {
          const result = {
            streamUrl: `https://discoveryprovider.audius.co/v1/tracks/${match.id}/stream?app_name=FURINA_MUSIC`,
            stream_url: `https://discoveryprovider.audius.co/v1/tracks/${match.id}/stream?app_name=FURINA_MUSIC`,
            streamType: 'audius',
            fullLength: true,
            provider: 'audius',
            title: match.title,
            artist: match.user?.name || cleanArtist,
            durationMs: (match.duration || 180) * 1000
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (_) {}

    // 3. Try Deezer stream
    try {
      const dz = await deezerProvider.findAudioStream(cleanTitle, cleanArtist);
      if (dz?.streamUrl) {
        this.cache.set(cacheKey, dz);
        return dz;
      }
    } catch (_) {}

    // 4. Try Apple Music / iTunes stream
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
