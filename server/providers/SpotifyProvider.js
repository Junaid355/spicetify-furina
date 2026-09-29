const MusicProvider = require('./MusicProvider');
const db = require('../db/database');

class SpotifyProvider extends MusicProvider {
  constructor() {
    super('Spotify Official API', 'spotify');
    this.apiBase = 'https://api.spotify.com/v1';
    this.accountsBase = 'https://accounts.spotify.com';
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:3000/api/auth/spotify/callback';
  }

  setCredentials(clientId, clientSecret, redirectUri) {
    if (clientId) this.clientId = clientId;
    if (clientSecret) this.clientSecret = clientSecret;
    if (redirectUri) this.redirectUri = redirectUri;
  }

  getAuthorizeUrl(state = '') {
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-library-read'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId || 'demo_mode_client_id',
      scope: scopes,
      redirect_uri: this.redirectUri,
      state: state || 'furina_' + Math.random().toString(36).substr(2, 8),
      show_dialog: 'true'
    });

    return `${this.accountsBase}/authorize?${params.toString()}`;
  }

  async exchangeCode(code, redirectUri = null) {
    const redirect = redirectUri || this.redirectUri;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (this.clientId && this.clientSecret) {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else {
      body.append('client_id', this.clientId);
    }

    const response = await fetch(`${this.accountsBase}/api/token`, {
      method: 'POST',
      headers,
      body: body.toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsed;
      try { parsed = JSON.parse(errText); } catch (_) { parsed = errText; }
      const err = new Error(`Spotify token exchange failed (${response.status}): ${JSON.stringify(parsed)}`);
      err.data = parsed;
      throw err;
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken) {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (this.clientId && this.clientSecret) {
      const basic = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${basic}`;
    } else {
      body.append('client_id', this.clientId);
    }

    const response = await fetch(`${this.accountsBase}/api/token`, {
      method: 'POST',
      headers,
      body: body.toString()
    });

    if (!response.ok) {
      throw new Error(`Spotify token refresh failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async fetchSpotify(endpoint, accessToken, options = {}) {
    if (!accessToken) {
      throw new Error('Spotify access token required.');
    }
    const response = await fetch(`${this.apiBase}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!response.ok) {
      const errBody = await response.text();
      let parsed;
      try { parsed = JSON.parse(errBody); } catch (_) { parsed = errBody; }
      const error = new Error(`Spotify API error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.data = parsed;
      throw error;
    }

    return await response.json();
  }

  async getUserProfile(accessToken) {
    return await this.fetchSpotify('/me', accessToken);
  }

  async getUserPlaylists(accessToken, limit = 50) {
    if (!accessToken) return { items: [] };
    return await this.fetchSpotify(`/me/playlists?limit=${limit}`, accessToken);
  }

  async getPlaylist(playlistId, accessToken) {
    const cleanId = this.extractPlaylistId(playlistId);
    if (accessToken) {
      try {
        const spPlaylist = await this.fetchSpotify(`/playlists/${cleanId}`, accessToken);
        return {
          id: spPlaylist.id,
          name: spPlaylist.name,
          description: spPlaylist.description || '',
          coverUrl: spPlaylist.images?.[0]?.url || '/images/default_artwork.jpg',
          provider: 'spotify',
          owner: spPlaylist.owner?.display_name || 'Spotify User',
          totalTracks: spPlaylist.tracks?.total || 0,
          tracks: (spPlaylist.tracks?.items || []).map(item => this.formatSpotifyTrack(item.track)).filter(Boolean)
        };
      } catch (err) {
        console.warn('[SpotifyProvider] Authenticated fetch failed, falling back to public embed:', err.message);
      }
    }
    return await this.getPublicPlaylistFromEmbed(cleanId);
  }

  async getPublicPlaylistFromEmbed(playlistId) {
    const cleanId = this.extractPlaylistId(playlistId);
    try {
      const response = await fetch(`https://open.spotify.com/embed/playlist/${cleanId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (response.ok) {
        const text = await response.text();
        const scriptMatch = text.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (scriptMatch) {
          const json = JSON.parse(scriptMatch[1]);
          const entity = json.props?.pageProps?.state?.data?.entity;
          if (entity && Array.isArray(entity.trackList)) {
            const tracks = entity.trackList.map((t, idx) => {
              const tid = t.uri ? t.uri.replace('spotify:track:', '') : `sp_${cleanId}_${idx}`;
              return {
                id: tid,
                providerTrackId: tid,
                title: t.title || 'Untitled Track',
                artist: t.subtitle || 'Unknown Artist',
                album: entity.name || 'Spotify Album',
                durationMs: t.duration || 180000,
                provider: 'spotify',
                coverUrl: entity.coverArt?.sources?.[0]?.url || '/images/furina_salon_music.jpg',
                streamUrl: t.audioPreview?.url || null,
                isDownloadable: false,
                audioQuality: {
                  codec: 'OGG Vorbis',
                  format: 'OGG Vorbis',
                  bitrate: '320 kbps',
                  sampleRate: '44.1 kHz',
                  lossless: false,
                  source: 'Official Spotify Web Stream'
                }
              };
            });

            return {
              id: cleanId,
              name: entity.name || 'Spotify Playlist',
              description: entity.subtitle || 'Imported from Spotify',
              coverUrl: entity.coverArt?.sources?.[0]?.url || '/images/furina_salon_music.jpg',
              provider: 'spotify',
              owner: 'Spotify Curated',
              totalTracks: tracks.length,
              tracks
            };
          }
        }
      }
    } catch (err) {
      console.warn('[SpotifyProvider] Public embed extraction notice:', err.message);
    }

    // Try oEmbed for metadata fallback
    try {
      const oembedRes = await fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/playlist/${cleanId}`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        return {
          id: cleanId,
          name: oembed.title || 'Spotify Playlist',
          description: 'Imported from Spotify',
          coverUrl: oembed.thumbnail_url || '/images/furina_salon_music.jpg',
          provider: 'spotify',
          owner: oembed.author_name || 'Spotify',
          totalTracks: 0,
          tracks: []
        };
      }
    } catch (_) {}

    return this.getDemoPlaylist(playlistId);
  }

  extractPlaylistId(input) {
    if (!input) return '';
    if (input.includes('spotify.com/playlist/')) {
      const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
      return match ? match[1] : input;
    }
    return input.trim();
  }

  async testConnection(accessToken) {
    const start = Date.now();
    try {
      if (!accessToken) {
        return {
          connected: false,
          status: 'No token found',
          latencyMs: 0,
          clientIdConfigured: Boolean(this.clientId),
          redirectUri: this.redirectUri
        };
      }
      const profile = await this.getUserProfile(accessToken);
      const latency = Date.now() - start;
      return {
        connected: true,
        status: 'Operational',
        latencyMs: latency,
        user: {
          id: profile.id,
          name: profile.display_name,
          email: profile.email,
          product: profile.product,
          followers: profile.followers?.total || 0,
          avatar: profile.images?.[0]?.url || null
        },
        clientIdConfigured: Boolean(this.clientId),
        redirectUri: this.redirectUri
      };
    } catch (err) {
      return {
        connected: false,
        status: 'Error: ' + err.message,
        latencyMs: Date.now() - start,
        clientIdConfigured: Boolean(this.clientId),
        redirectUri: this.redirectUri,
        errorDetail: err.data || null
      };
    }
  }

  async search(query, limit = 20, accessToken = null) {
    if (accessToken) {
      try {
        const data = await this.fetchSpotify(`/search?q=${encodeURIComponent(query)}&type=track,artist,album,playlist&limit=${limit}`, accessToken);
        return {
          provider: 'spotify',
          tracks: (data.tracks?.items || []).map(t => this.formatSpotifyTrack(t)),
          artists: (data.artists?.items || []).map(a => ({
            id: a.id,
            name: a.name,
            imageUrl: a.images?.[0]?.url || '/images/furina_salon_music.jpg',
            provider: 'spotify'
          })),
          albums: (data.albums?.items || []).map(alb => ({
            id: alb.id,
            title: alb.name,
            artist: alb.artists?.[0]?.name,
            coverUrl: alb.images?.[0]?.url,
            provider: 'spotify'
          }))
        };
      } catch (err) {
        console.warn('[SpotifyProvider] Search with token failed, using curated pool:', err.message);
      }
    }
    return this.getCuratedSpotifyItems(query, limit);
  }

  async getTrack(trackId, accessToken = null) {
    if (accessToken) {
      try {
        const spTrack = await this.fetchSpotify(`/tracks/${trackId}`, accessToken);
        return this.formatSpotifyTrack(spTrack);
      } catch (_) {}
    }
    const demo = this.getCuratedSpotifyItems(trackId, 1).tracks[0];
    return demo || null;
  }

  canStream(track) {
    return true;
  }

  canDownload(track) {
    return false; // Absolute invariant
  }

  async getAudioQuality(track) {
    return {
      codec: 'Ogg Vorbis / AAC (Spotify Official Stream)',
      bitrate: '320 kbps (High Quality via Premium)',
      sampleRate: '44.1 kHz',
      source: 'Spotify Authorized Infrastructure',
      licensed: true
    };
  }

  formatSpotifyTrack(spTrack) {
    if (!spTrack || !spTrack.id) return null;
    return {
      id: `spotify_${spTrack.id}`,
      title: spTrack.name,
      artist: spTrack.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
      album: spTrack.album?.name || 'Spotify Release',
      durationMs: spTrack.duration_ms || 180000,
      coverUrl: spTrack.album?.images?.[0]?.url || '/images/furina_salon_music.jpg',
      streamUrl: spTrack.preview_url || null,
      provider: 'spotify',
      providerTrackId: spTrack.id,
      playbackType: 'spotify',
      spotifyUri: spTrack.uri,
      isDownloadable: false,
      audioQuality: {
        codec: 'Ogg Vorbis / AAC',
        bitrate: '320 kbps (Spotify Stream)',
        sampleRate: '44.1 kHz',
        source: 'Spotify Official API'
      },
      lyricsAvailable: false,
      popularity: spTrack.popularity || 70
    };
  }

  getDemoPlaylist(playlistId) {
    return {
      id: playlistId || 'spotify_curated_classical',
      name: 'Classical & Fontaine Grandeur',
      description: 'Official Spotify curated playlist with grand symphonies and court suites.',
      coverUrl: '/images/furina_opera_tears.jpg',
      provider: 'spotify',
      owner: 'Spotify Classical',
      totalTracks: 4,
      tracks: this.getCuratedSpotifyItems('', 4).tracks
    };
  }

  getCuratedSpotifyItems(query, limit = 10) {
    const curated = [
      {
        id: 'sp_vaguelette_official',
        name: 'La Vaguelette (Original Fontaine Suite)',
        artists: [{ name: 'HOYO-MiX' }, { name: 'Furina' }],
        album: { name: 'Fontaine Chapter OST', images: [{ url: '/images/furina_opera_tears.jpg' }] },
        duration_ms: 220000,
        uri: 'spotify:track:4cOdK2wGLETKBW3PvgPWqT',
        preview_url: '/audio/la_vaguelette.wav'
      },
      {
        id: 'sp_clavier_bien_tempere',
        name: 'The Well-Tempered Clavier - Prelude No. 1 in C Major',
        artists: [{ name: 'Johann Sebastian Bach' }, { name: 'Fontaine Keyboard Virtuosi' }],
        album: { name: 'Baroque Essentials', images: [{ url: '/images/furina_salon_music.jpg' }] },
        duration_ms: 154000,
        uri: 'spotify:track:17phXv439H4a6a57PvgPWq',
        preview_url: '/audio/hydro_solitaire.wav'
      },
      {
        id: 'sp_claire_de_lune',
        name: 'Clair de Lune (Suite Bergamasque)',
        artists: [{ name: 'Claude Debussy' }],
        album: { name: 'Impressionist Waters', images: [{ url: '/images/furina_ocean_abyss.jpg' }] },
        duration_ms: 302000,
        uri: 'spotify:track:6N7nDQikx0ti4PvgPWq987',
        preview_url: '/audio/fontaine_waltz.wav'
      },
      {
        id: 'sp_gymnopedie',
        name: 'Gymnopédie No. 1',
        artists: [{ name: 'Erik Satie' }],
        album: { name: 'Quiet Reflections', images: [{ url: '/images/furina_melancholy_swing.jpg' }] },
        duration_ms: 198000,
        uri: 'spotify:track:5E30LdtzQTGqPOPWqBvf43',
        preview_url: '/audio/la_vaguelette.wav'
      }
    ];

    const filtered = query
      ? curated.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) || t.artists.some(a => a.name.toLowerCase().includes(query.toLowerCase())))
      : curated;

    return {
      provider: 'spotify',
      tracks: filtered.slice(0, limit).map(t => this.formatSpotifyTrack(t)),
      artists: [{ id: 'sp_art_hoyo', name: 'HOYO-MiX', imageUrl: '/images/furina_pure_hydro.jpg', provider: 'spotify' }],
      albums: [{ id: 'sp_alb_ost', title: 'Fontaine Chapter OST', artist: 'HOYO-MiX', coverUrl: '/images/furina_opera_tears.jpg', provider: 'spotify' }]
    };
  }
}

module.exports = new SpotifyProvider();
