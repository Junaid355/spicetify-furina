/**
 * Furina Music — Discord Activity & Rich Presence Engine
 * Supports Native WebSocket Bridge (ws://127.0.0.1:3550), HTTP IPC fallback,
 * Discord Embedded App SDK, and Electron IPC.
 */

class FurinaDiscordActivity {
  constructor() {
    this.clientId = '383226320970055681';
    this.isEmbeddedActivity = false;
    this.discordSdk = null;
    this.isBridgeConnected = false;
    this.discordUser = null;
    this.currentTrack = null;
    this.ws = null;
    this.wsReconnectTimer = null;

    this.checkEnvironment();
    this.initWebSocketBridge();
    this.bindAudioEvents();
  }

  checkEnvironment() {
    const params = new URLSearchParams(window.location.search);
    this.isEmbeddedActivity = !!(params.get('frame_id') || params.get('instance_id') || window.name === 'discord_activity');

    if (this.isEmbeddedActivity) {
      console.log('[DiscordActivity] Running inside Discord Embedded App container.');
      this.initEmbeddedSDK();
    }
  }

  initWebSocketBridge() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Connect over WebSocket — works seamlessly from HTTPS pages to local machine
      this.ws = new WebSocket('ws://127.0.0.1:3550');

      this.ws.onopen = () => {
        console.log('[DiscordActivity] Connected to local Discord WebSocket Bridge.');
        this.isBridgeConnected = true;
        this.updatePresenceBadge(true);
        // If track is already playing, broadcast immediately
        if (this.currentTrack) {
          const isPlaying = window.furinaAudio ? window.furinaAudio.isPlaying : true;
          this.sendWsActivity(this.currentTrack, isPlaying);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.user) {
            this.discordUser = data.user;
            this.isBridgeConnected = true;
            this.updatePresenceBadge(true);
          } else if (data.type === 'disconnect') {
            this.isBridgeConnected = false;
            this.updatePresenceBadge(false);
          }
        } catch (_) {}
      };

      this.ws.onerror = () => {
        this.isBridgeConnected = false;
      };

      this.ws.onclose = () => {
        this.isBridgeConnected = false;
        this.updatePresenceBadge(false);
        this.ws = null;
        if (!this.wsReconnectTimer) {
          this.wsReconnectTimer = setTimeout(() => {
            this.wsReconnectTimer = null;
            this.initWebSocketBridge();
          }, 4000);
        }
      };
    } catch (e) {
      console.debug('[DiscordActivity] WS Bridge init error:', e.message);
      if (!this.wsReconnectTimer) {
        this.wsReconnectTimer = setTimeout(() => {
          this.wsReconnectTimer = null;
          this.initWebSocketBridge();
        }, 5000);
      }
    }
  }

  sendWsActivity(track, isPlaying) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false;
    const title = track.title || 'Fontaine Melodies';
    const artist = track.artist || 'Furina';
    const coverUrl = track.cover_url || track.coverUrl || 'https://raw.githubusercontent.com/Junaid355/spicetify-furina/main/public/icons/app-icon.jpg';

    this.ws.send(JSON.stringify({
      type: isPlaying ? 'play' : 'pause',
      title,
      artist,
      isPlaying,
      coverUrl
    }));
    return true;
  }

  async initEmbeddedSDK() {
    try {
      if (!window.DiscordSDK) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@discord/embedded-app-sdk@1.3.1/dist/index.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (window.DiscordSDK) {
        this.discordSdk = new window.DiscordSDK.DiscordSDK(this.clientId);
        await this.discordSdk.ready();
        this.updatePresenceBadge(true);
      }
    } catch (err) {
      console.warn('[DiscordActivity] Discord Embedded SDK notice:', err.message);
    }
  }

  bindAudioEvents() {
    if (window.furinaAudio) {
      window.furinaAudio.on('trackchange', (track) => this.onTrackChange(track));
      window.furinaAudio.on('statechange', ({ isPlaying }) => this.onStateChange(isPlaying));
    } else {
      setTimeout(() => this.bindAudioEvents(), 400);
    }
  }

  onTrackChange(track) {
    this.currentTrack = track;
    this.updateDiscordPresence(track, true);
  }

  onStateChange(isPlaying) {
    if (this.currentTrack) {
      this.updateDiscordPresence(this.currentTrack, isPlaying);
    }
  }

  async updateDiscordPresence(track, isPlaying) {
    if (!track) return;
    this.currentTrack = track;
    const title = track.title || 'Fontaine Melodies';
    const artist = track.artist || 'Furina';
    const coverUrl = track.cover_url || track.coverUrl || 'https://raw.githubusercontent.com/Junaid355/spicetify-furina/main/public/icons/app-icon.jpg';

    // 1. High-Priority: WebSocket Bridge to local Discord client
    const sentWs = this.sendWsActivity(track, isPlaying);

    // 2. HTTP Fallback / Beacon (for Electron or localhost)
    if (!sentWs) {
      try {
        fetch('http://127.0.0.1:3550/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, artist, isPlaying, coverUrl }),
          signal: AbortSignal.timeout(1000)
        }).catch(() => {});
      } catch (_) {}
    }

    // 3. Electron Desktop IPC Bridge
    if (window.electronAPI && typeof window.electronAPI.updateDiscordRPC === 'function') {
      window.electronAPI.updateDiscordRPC({
        details: title,
        state: `by ${artist} — Furina Music`,
        largeImageKey: coverUrl,
        largeImageText: 'Furina Music (Fontaine Opera)',
        smallImageKey: isPlaying ? 'play' : 'pause',
        smallImageText: isPlaying ? 'Playing' : 'Paused',
        instance: false,
        buttons: [
          { label: '🎵 Listen on Web', url: 'https://junaid355.github.io/' }
        ]
      });
    }

    // 4. Embedded App SDK Activity State
    if (this.discordSdk) {
      try {
        this.discordSdk.commands.setActivity({
          activity: {
            type: 2, // LISTENING
            details: title,
            state: `by ${artist}`,
            assets: {
              large_image: coverUrl,
              large_text: 'Furina Music'
            }
          }
        });
      } catch (_) {}
    }

    const badge = document.getElementById('discord-activity-pill');
    if (badge) {
      badge.classList.toggle('active', isPlaying);
      const userTag = this.discordUser ? ` (${this.discordUser.global_name || this.discordUser.username})` : '';
      badge.title = `Discord Rich Presence Active${userTag}: Listening to ${title} — ${artist}`;
    }
  }

  updatePresenceBadge(connected) {
    const badge = document.getElementById('discord-activity-pill');
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.classList.toggle('active', connected);
      if (connected) {
        badge.style.color = '#5865F2';
        badge.style.boxShadow = '0 0 12px rgba(88, 101, 242, 0.4)';
      }
    }
  }

  shareActivityToDiscord() {
    const cur = window.furinaAudio?.currentTrack;
    const title = cur?.title || 'Furina Music';
    const artist = cur?.artist || 'Furina';
    const webUrl = 'https://junaid355.github.io/';
    const shareText = `🎵 Listening to **${title}** by **${artist}** on Furina Music ✦ ${webUrl}`;

    if (this.isBridgeConnected && this.discordUser) {
      if (typeof showToast === 'function') {
        showToast(`✦ Discord Presence live on @${this.discordUser.username}'s profile!`, 'success');
      }
      return;
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        if (typeof showToast === 'function') {
          showToast('Status copied to clipboard!', 'success');
        }
      });
    }
  }
}

window.furinaDiscord = new FurinaDiscordActivity();
