/**
 * Furina Music — Velvet Fontaine Acoustic Feedback Engine
 * Whisper-soft tactile click & ambient raindrop droplets via native Web Audio API.
 * Defaults to subtle/quiet, never harsh or intrusive.
 */

(function () {
  'use strict';

  class FurinaAudioEffects {
    constructor() {
      this.ctx = null;
      // Default to OFF or very subtle so user is not annoyed by repetitive clicks
      this.isEnabled = localStorage.getItem('furina_cozy_sounds') === 'true';
      this.volume = parseFloat(localStorage.getItem('furina_cozy_volume') || '0.04');
      this.lastPlayTime = 0;

      this.initEventListeners();
    }

    initContext() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    }

    // Gentle Velvet Raindrop (Subtle, organic water droplet feel)
    playHydroChime(pitch = 1.0) {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.1) return;
        this.lastPlayTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(340 * pitch, now + 0.06);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
      } catch (_) {}
    }

    // Whisper-Soft Micro-Haptic Tap (Extremely quiet mechanical thud, zero pitch beep)
    playTactileClick() {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.08) return;
        this.lastPlayTime = now;

        // Use low-frequency shaped envelope for subtle cushion feel
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.015);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.02);
      } catch (_) {}
    }

    playChord(action = 'play') {
      if (!this.isEnabled) return;
      this.playHydroChime(action === 'play' ? 1.0 : 0.85);
    }

    toggle(enabled = null) {
      this.isEnabled = (enabled !== null) ? enabled : !this.isEnabled;
      localStorage.setItem('furina_cozy_sounds', String(this.isEnabled));
      if (this.isEnabled) this.playHydroChime(1.0);
      return this.isEnabled;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0.04));
      localStorage.setItem('furina_cozy_volume', String(this.volume));
    }

    initEventListeners() {
      // Only listen on main navigation items when enabled, never on all buttons
      document.addEventListener('click', (e) => {
        if (!this.isEnabled) return;
        const nav = e.target.closest('.nav-item');
        if (nav) {
          this.playHydroChime(1.0);
          return;
        }
        const playBtn = e.target.closest('.control-btn-play, .btn-play-hero');
        if (playBtn) {
          this.playTactileClick();
        }
      }, { passive: true });
    }
  }

  window.furinaAudioEffects = new FurinaAudioEffects();
})();
