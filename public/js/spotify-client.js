/**
 * Furina Music — Official Spotify Client & Web Playback SDK Bridge
 * Manages Spotify OAuth tokens, official SDK loading and playback delegation.
 */
class SpotifyClient {
  constructor() {
    this.accessToken = localStorage.getItem('furina_spotify_access_token') || null;
    this.player = null;
    this.deviceId = null;
    this.isReady = false;
    this.userProfile = null;

    if (this.accessToken) {
      this.initSdk();
      this.fetchProfile();
    }
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
        // Sync with backend session
        await fetch('/api/auth/spotify/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: this.accessToken, profile: this.userProfile })
        });
        return this.userProfile;
      }
    } catch (e) {
      console.warn('[SpotifyClient] Fetch profile notice:', e.message);
    }
    return null;
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
      name: 'Furina Music Web Player',
      getOAuthToken: cb => { cb(this.accessToken); },
      volume: 0.8
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
      console.warn('[Spotify SDK] Initialization error:', message);
    });

    this.player.addListener('authentication_error', ({ message }) => {
      console.warn('[Spotify SDK] Authentication error:', message);
      this.clearToken();
    });

    this.player.addListener('account_error', ({ message }) => {
      console.warn('[Spotify SDK] Account error (Spotify Premium required for Web Playback SDK):', message);
    });

    this.player.connect();
  }

  async playUri(spotifyUri) {
    if (!this.accessToken) throw new Error('Spotify not connected.');
    if (!this.deviceId) throw new Error('Spotify player device not ready.');

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ uris: [spotifyUri] })
    });
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
