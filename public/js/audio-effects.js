/**
 * Furina Music — Ultra-Cozy Acoustic Haptic & Sound Effects Engine
 * Produces velvet micro-taps and soothing crystalline Fontaine marimba droplets
 * via native Web Audio API (zero external audio files needed).
 */

(function () {
  'use strict';

  class FurinaAudioEffects {
    constructor() {
      this.ctx = null;
      this.isEnabled = localStorage.getItem('furina_cozy_sounds') !== 'false';
      // Pleasant, gentle whisper volume default (0.12)
      this.volume = parseFloat(localStorage.getItem('furina_cozy_volume') || '0.12');
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

    // Soothing Fontaine Crystal Drop (Acoustic Kalimba / Warm Water Marimba)
    playHydroChime(pitch = 1.0) {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.06) return; // Debounce rapid triggers
        this.lastPlayTime = now;

        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const baseFreq = 440 * pitch; // Warm concert A4
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, now);

        subOsc.type = 'triangle';
        subOsc.frequency.setValueAtTime(baseFreq * 0.5, now);

        // Warm acoustic low-pass filtering
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.12);
        filter.Q.setValueAtTime(1.5, now);

        // Smooth velvet envelope
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.15, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        osc.connect(filter);
        subOsc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.15);
        subOsc.stop(now + 0.15);
      } catch (_) {}
    }

    // Ultra-Delicate Haptic Micro-Tap (Tactile Key Feel, Zero Harshness)
    playTactileClick() {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.04) return; // Debounce rapid clicks
        this.lastPlayTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(175, now);
        osc.frequency.exponentialRampToValueAtTime(75, now + 0.022);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.12, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.03);
      } catch (_) {}
    }

    // Gentle Warm Two-Note Harmony on Play/Pause
    playChord(action = 'play') {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = action === 'play' ? [329.63, 493.88] : [493.88, 329.63]; // E4 + B4 (Pure Fifth)

        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          const startTime = now + idx * 0.035;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, startTime);

          gain.gain.setValueAtTime(0.0001, startTime);
          gain.gain.linearRampToValueAtTime(this.volume * 0.1, startTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.18);
        });
      } catch (_) {}
    }

    toggle(enabled = null) {
      this.isEnabled = (enabled !== null) ? enabled : !this.isEnabled;
      localStorage.setItem('furina_cozy_sounds', String(this.isEnabled));
      if (this.isEnabled) this.playHydroChime(1.0);
      return this.isEnabled;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0.12));
      localStorage.setItem('furina_cozy_volume', String(this.volume));
    }

    initEventListeners() {
      // Delegate gentle haptic feedback across interactive elements
      document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .nav-item, .card-item, .theme-option, .search-pill, .control-btn, .logger-filter-pill, .logger-btn-action, .sidebar-pl-link');
        if (!target) return;

        if (target.classList.contains('control-btn') || target.classList.contains('btn-play-hero')) {
          this.playChord('play');
        } else if (target.classList.contains('nav-item') || target.classList.contains('theme-option') || target.classList.contains('search-pill')) {
          this.playHydroChime(1.05);
        } else {
          this.playTactileClick();
        }
      }, { passive: true });
    }
  }

  window.furinaAudioEffects = new FurinaAudioEffects();
})();
