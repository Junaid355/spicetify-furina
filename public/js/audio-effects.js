/**
 * Furina Music — Cozy Web Audio Haptic & Sound Effects Engine
 * Generates tactile mechanical clicks and soft crystalline hydro droplet chimes
 * using purely native Web Audio API oscillators (zero external audio files needed).
 */

(function () {
  'use strict';

  class FurinaAudioEffects {
    constructor() {
      this.ctx = null;
      this.isEnabled = localStorage.getItem('furina_cozy_sounds') !== 'false';
      this.volume = parseFloat(localStorage.getItem('furina_cozy_volume') || '0.25');

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

    // Cozy Hydro Water Droplet Chime
    playHydroChime(pitchMultiplier = 1.0) {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        // Elegant hydro chime pitch bend
        const startFreq = 880 * pitchMultiplier;
        const endFreq = 1320 * pitchMultiplier;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.3);
      } catch (_) {}
    }

    // Soft Tactile Mechanical Switch Tap
    playTactileClick() {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.045);
      } catch (_) {}
    }

    // Playback Action (Play / Pause) Hydro Chord
    playChord(action = 'play') {
      if (!this.isEnabled) return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const baseFreq = action === 'play' ? 523.25 : 659.25; // C5 or E5
        const freqs = action === 'play' ? [523.25, 659.25, 783.99] : [783.99, 659.25, 523.25];

        freqs.forEach((f, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);

          gain.gain.setValueAtTime(0.001, now + idx * 0.04);
          gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + idx * 0.04 + 0.015);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.04 + 0.22);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.25);
        });
      } catch (_) {}
    }

    toggle(enabled = null) {
      this.isEnabled = (enabled !== null) ? enabled : !this.isEnabled;
      localStorage.setItem('furina_cozy_sounds', String(this.isEnabled));
      if (this.isEnabled) this.playHydroChime(1.2);
      return this.isEnabled;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0.25));
      localStorage.setItem('furina_cozy_volume', String(this.volume));
    }

    initEventListeners() {
      // Delegate clicks across interactive elements
      document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .nav-item, .card-item, .theme-option, .search-pill, .control-btn, .logger-filter-pill, .logger-btn-action');
        if (!target) return;

        if (target.classList.contains('control-btn') || target.classList.contains('btn-play-hero')) {
          this.playChord('play');
        } else if (target.classList.contains('nav-item') || target.classList.contains('theme-option') || target.classList.contains('search-pill')) {
          this.playHydroChime(1.1);
        } else {
          this.playTactileClick();
        }
      }, { passive: true });
    }
  }

  window.furinaAudioEffects = new FurinaAudioEffects();
})();
