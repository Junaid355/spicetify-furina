/**
 * Furina Music — Discord Activity & Rich Presence Engine
 * Supports Native Local IPC Bridge (port 3550), Discord Embedded App SDK, and Electron IPC.
 */

class FurinaDiscordActivity {
  constructor() {
    this.clientId = '383226320970055681';
    this.isEmbeddedActivity = false;
    this.discordSdk = null;
    this.isBridgeConnected = false;
    this.discordUser = null;
    this.currentTrack = null;

    this.checkEnvironment();
    this.checkLocalBridge();
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

  async checkLocalBridge() {
    try {
      const res = await fetch('http://127.0.0.1:3550/status', { signal: AbortSignal.timeout(1500) });
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          this.isBridgeConnected = true;
          this.discordUser = data.user;
          console.log('[DiscordActivity] Connected to Discord RPC Bridge for:', data.user?.global_name || data.user?.username);
          this.updatePresenceBadge(true);
        }
      }
    } catch (_) {}
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
      setTimeout(() => this.bindAudioEvents(), 500);
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
    const title = track.title || 'Fontaine Melodies';
    const artist = track.artist || 'Furina';
    const coverUrl = track.cover_url || track.coverUrl || 'https://junaid355.github.io/icons/app-icon.jpg';

    // 1. Send to Native Local Discord IPC Bridge (Real-Time Profile Presence)
    try {
      const res = await fetch('http://127.0.0.1:3550/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          artist,
          isPlaying
        }),
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          this.isBridgeConnected = true;
          this.discordUser = data.user;
          this.updatePresenceBadge(true);
        }
      }
    } catch (_) {}

    // 2. Electron Desktop IPC Bridge
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

    // 3. Embedded App SDK Activity State
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
