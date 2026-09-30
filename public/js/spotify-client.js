/**
 * Furina Music — Multi-User Official Spotify Client & Web Playback SDK Bridge
 * Supports official Spotify OAuth (PKCE & Token flow), dynamic user profile loading,
 * user-specific playlist retrieval, liked songs, and Web Playback SDK streaming.
 */
class SpotifyClient {
  constructor() {
    this.accessToken = localStorage.getItem('furina_spotify_access_token') || null;
    this.player = null;
    this.deviceId = null;
    this.isReady = false;
    this.userProfile = null;
    this.userPlaylists = [];
    this.userLikedTracks = [];

    // Check if redirect contains access_token in URL hash (Implicit Grant / PKCE)
    this.checkUrlHashAuth();

    if (this.accessToken) {
      this.initSdk();
      this.fetchProfile();
    }
  }

  // Handle Spotify redirect with #access_token=...
  checkUrlHashAuth() {
    if (window.location.hash && window.location.hash.includes('access_token=')) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const token = hashParams.get('access_token');
      const expiresIn = parseInt(hashParams.get('expires_in') || '3600', 10);
      if (token) {
        console.log('[SpotifyClient] Extracted official access token from redirect hash.');
        this.setToken(token, expiresIn);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }

  // Initiate Spotify OAuth Login (Multi-user safe: show_dialog=true allows any user to log into their own account)
  login(customClientId = null) {
    const clientId = customClientId || 
                     localStorage.getItem('furina_spotify_client_id') || 
                     '23WxsmliKISYaCfam8iPPG'; // Fallback configured ID or prompt user

    const redirectUri = window.location.origin + window.location.pathname;
    const scopes = [
      'user-read-private',
      'user-read-email',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-library-read',
      'user-library-modify',
      'user-top-read',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state'
    ].join(' ');

    const authUrl = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&show_dialog=true`;
    console.log('[SpotifyClient] Redirecting to official Spotify login prompt...');
    window.location.href = authUrl;
  }

  setToken(token, expiresIn = 3600) {
    this.accessToken = token;
    localStorage.setItem('furina_spotify_access_token', token);
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem('furina_spotify_expires_at', expiresAt.toString());
    this.initSdk();
    this.fetchProfile();
  }

  clearToken() {
    this.accessToken = null;
    this.userProfile = null;
    this.userPlaylists = [];
    this.userLikedTracks = [];
    localStorage.removeItem('furina_spotify_access_token');
    localStorage.removeItem('furina_spotify_expires_at');
    if (this.player) {
      try { this.player.disconnect(); } catch (_) {}
      this.player = null;
    }
    this.isReady = false;
    this.deviceId = null;
  }

  async fetchProfile() {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        this.userProfile = await res.json();
        console.log(`[SpotifyClient] Loaded Spotify profile for: ${this.userProfile.display_name} (${this.userProfile.id})`);
        
        // Try backend sync if local server is running
        try {
          await fetch('/api/auth/spotify/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: this.accessToken, profile: this.userProfile })
          });
        } catch (_) {}

        return this.userProfile;
      } else if (res.status === 401) {
        console.warn('[SpotifyClient] Token expired, clearing session.');
        this.clearToken();
      }
    } catch (e) {
      console.warn('[SpotifyClient] Fetch profile notice:', e.message);
    }
    return null;
  }

  // Fetch logged-in user's real private & public playlists
  async fetchUserPlaylists() {
    if (!this.accessToken) return [];
    try {
      const res = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.userPlaylists = (data.items || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || 'Spotify User Playlist',
          cover_url: p.images?.[0]?.url || './icons/app-icon.jpg',
          track_count: p.tracks?.total || 0,
          provider: 'spotify',
          owner: p.owner?.display_name || 'Spotify'
        }));
        return this.userPlaylists;
      }
    } catch (err) {
      console.warn('[SpotifyClient] Failed to fetch playlists:', err);
    }
    return [];
  }

  // Fetch logged-in user's liked songs
  async fetchUserLikedSongs() {
    if (!this.accessToken) return [];
    try {
      const res = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { 'Authorization': `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        this.userLikedTracks = (data.items || []).map(item => {
          const t = item.track;
          return {
            id: `sp_${t.id}`,
            spotifyUri: t.uri,
            title: t.name,
            artist: t.artists?.map(a => a.name).join(', ') || 'Unknown Artist',
            album: t.album?.name || 'Single',
            cover_url: t.album?.images?.[0]?.url || './icons/app-icon.jpg',
            duration_ms: t.duration_ms,
            stream_url: t.preview_url || '',
            provider: 'spotify'
          };
        });
        return this.userLikedTracks;
      }
    } catch (err) {
      console.warn('[SpotifyClient] Failed to fetch liked songs:', err);
    }
    return [];
  }

  // Add track to Spotify playlist
  async addTrackToPlaylist(playlistId, trackUri) {
    if (!this.accessToken) throw new Error('Spotify not connected.');
    const res = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [trackUri] })
    });
    return res.ok;
  }

  initSdk() {
    if (!window.Spotify && !document.getElementById('spotify-player-sdk-script')) {
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.setupPlayerInstance();
      };
      const script = document.createElement('script');
      script.id = 'spotify-player-sdk-script';
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      document.head.appendChild(script);
    } else if (window.Spotify) {
      this.setupPlayerInstance();
    }
  }

  setupPlayerInstance() {
    if (!this.accessToken || this.player) return;

    this.player = new window.Spotify.Player({
      name: 'Furina Music Spicetify Player',
      getOAuthToken: cb => { cb(this.accessToken); },
      volume: 0.85
    });

    this.player.addListener('ready', ({ device_id }) => {
      console.log('[Spotify SDK] Ready with Device ID:', device_id);
      this.deviceId = device_id;
      this.isReady = true;
    });

    this.player.addListener('not_ready', ({ device_id }) => {
      console.log('[Spotify SDK] Device ID is offline:', device_id);
      this.isReady = false;
    });

    this.player.addListener('initialization_error', ({ message }) => {
      console.warn('[Spotify SDK] Initialization notice:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.warn('[Spotify SDK] Authentication notice:', message);
      this.clearToken();
    });

    this.player.addListener('account_error', ({ message }) => {
      console.log('[Spotify SDK] Free accounts stream via Full Audio Streamer.');
    });

    this.player.connect();
  }

  async playUri(spotifyUri) {
    if (!this.accessToken) throw new Error('Spotify not connected.');
    if (!this.deviceId) throw new Error('Spotify player device not ready.');

    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [spotifyUri] })
    });
    if (!res.ok) {
      throw new Error(`Spotify play failed (${res.status})`);
    }
  }

  async pause() {
    if (this.player && this.isReady) {
      await this.player.pause();
    }
  }

  async resume() {
    if (this.player && this.isReady) {
      await this.player.resume();
    }
  }
}

window.spotifyClient = new SpotifyClient();
