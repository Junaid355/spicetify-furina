/**
 * Furina Music — Discord Activity & Rich Presence Engine
 * Supports Discord Embedded App SDK for voice channels, Electron RPC, and Web Activity sharing.
 */

class FurinaDiscordActivity {
  constructor() {
    this.clientId = '1298492817294827520'; // Registered Furina Music Discord Application ID
    this.isEmbeddedActivity = false;
    this.discordSdk = null;
    this.isConnected = false;
    this.currentTrack = null;

    this.checkEnvironment();
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
        this.isConnected = true;
        console.log('[DiscordActivity] Discord Embedded SDK ready & channel synced.');
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

  updateDiscordPresence(track, isPlaying) {
    if (!track) return;
    const title = track.title || 'Fontaine Melodies';
    const artist = track.artist || 'Furina';
    const coverUrl = track.cover_url || track.coverUrl || 'https://junaid355.github.io/icons/app-icon.jpg';

    // 1. Electron Desktop IPC Bridge
    if (window.electronAPI && typeof window.electronAPI.updateDiscordRPC === 'function') {
      window.electronAPI.updateDiscordRPC({
        details: `Listening to ${title}`,
        state: `by ${artist}`,
        largeImageKey: coverUrl,
        largeImageText: 'Furina Music',
        smallImageKey: isPlaying ? 'play' : 'pause',
        smallImageText: isPlaying ? 'Playing' : 'Paused',
        instance: false,
        buttons: [
          { label: '🎵 Listen on Web', url: 'https://junaid355.github.io/' }
        ]
      });
    }

    // 2. Embedded App SDK Activity State
    if (this.discordSdk && this.isConnected) {
      try {
        this.discordSdk.commands.setActivity({
          activity: {
            type: 2, // LISTENING
            details: title,
            state: `by ${artist}`,
            assets: {
              large_image: coverUrl,
              large_text: 'Furina Music (Fontaine)'
            }
          }
        });
      } catch (_) {}
    }

    // Update Activity Badge in UI
    const badge = document.getElementById('discord-activity-pill');
    if (badge) {
      badge.classList.toggle('active', isPlaying);
      badge.title = `Discord Activity: ${title} — ${artist}`;
    }
  }

  updatePresenceBadge(connected) {
    const badge = document.getElementById('discord-activity-pill');
    if (badge) {
      badge.style.display = 'inline-flex';
      badge.classList.toggle('active', connected);
    }
  }

  shareActivityToDiscord() {
    const cur = window.furinaAudio?.currentTrack;
    const title = cur?.title || 'Furina Music Repertoire';
    const artist = cur?.artist || 'Furina de Fontaine';
    const webUrl = 'https://junaid355.github.io/';
    const shareText = `🎵 Listening to **${title}** by **${artist}** on Furina Music ✦ ${webUrl}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareText).then(() => {
        if (typeof showToast === 'function') {
          showToast('Discord status copied! Paste into Discord channel or status', 'success');
        }
      });
    }

    // Open Discord Web / App Share
    const discordIntentUrl = `https://discord.com/app`;
    window.open(discordIntentUrl, '_blank', 'width=1000,height=700');
  }
}

window.furinaDiscord = new FurinaDiscordActivity();
