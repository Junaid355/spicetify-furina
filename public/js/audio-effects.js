/**
 * Furina Music — Velvet Fontaine Acoustic Feedback Engine (v8.0)
 * Ultra-cozy, whisper-soft acoustic feedback via native Web Audio API.
 * Provides tuned crystal bells, iPhone-style tactile mechanical haptics,
 * and soothing hydro droplets. Never harsh, abrasive, or synthetic.
 */

(function () {
  'use strict';

  class FurinaAudioEffects {
    constructor() {
      this.ctx = null;
      this.soundMode = localStorage.getItem('furina_sound_profile') || 'haptic'; // 'haptic' | 'crystal' | 'droplet' | 'off'
      this.isEnabled = localStorage.getItem('furina_cozy_sounds') !== 'false'; // Default enabled for instant cozy feedback
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

    // 1. Cozy Whisper-Soft Acoustic Wooden / Glass Dampened Mechanical Thud
    // Low-pass filtered impulse + fixed 72Hz body resonance with ZERO pitch slide.
    playVelvetHaptic() {
      if (!this.isEnabled || this.soundMode === 'off') return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.05) return;
        this.lastPlayTime = now;

        // A. Fixed frequency body resonance — ZERO pitch slide
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        const bodyFilter = this.ctx.createBiquadFilter();

        osc.type = 'triangle'; // Organic, warm acoustic body tone
        osc.frequency.setValueAtTime(72, now); // Fixed 72Hz — zero pitch slide!

        bodyFilter.type = 'lowpass';
        bodyFilter.frequency.setValueAtTime(160, now);
        bodyFilter.Q.setValueAtTime(1.8, now);

        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.001);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);

        osc.connect(bodyFilter);
        bodyFilter.connect(oscGain);
        oscGain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.024);

        // B. Acoustic dampened wooden/glass impulse click transient (low-pass filtered micro-impulse)
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.012); // 12ms transient
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          const decay = Math.exp(-i / (this.ctx.sampleRate * 0.0025));
          data[i] = (Math.random() * 2 - 1) * decay;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(280, now); // Dampened wooden/glass acoustic filter
        noiseFilter.Q.setValueAtTime(1.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.0001, now);
        noiseGain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.0008);
        noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.016);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noiseNode.start(now);
        noiseNode.stop(now + 0.018);
      } catch (_) {}
    }

    // 2. Fontaine Crystal Chime (Gentle celesta / musical glass overtone, rapid smooth decay)
    playCrystalChime(pitchMultiplier = 1.0) {
      if (!this.isEnabled || this.soundMode === 'off') return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.08) return;
        this.lastPlayTime = now;

        const oscFundamental = this.ctx.createOscillator();
        const oscHarmonic = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        const baseFreq = 880 * pitchMultiplier; // A5 warm bell tone
        oscFundamental.type = 'sine';
        oscFundamental.frequency.setValueAtTime(baseFreq, now);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(baseFreq * 2.02, now); // Gentle natural overtone

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

        oscFundamental.connect(filter);
        oscHarmonic.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        oscFundamental.start(now);
        oscHarmonic.start(now);
        oscFundamental.stop(now + 0.07);
        oscHarmonic.stop(now + 0.07);
      } catch (_) {}
    }

    // 3. Soothing Hydro Droplet (Soft resonant water droplet)
    playHydroDroplet() {
      if (!this.isEnabled || this.soundMode === 'off') return;
      try {
        this.initContext();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        if (now - this.lastPlayTime < 0.08) return;
        this.lastPlayTime = now;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(640, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(540, now);
        filter.Q.value = 3.0;

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(this.volume * 0.35, now + 0.003);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.055);
      } catch (_) {}
    }

    // Master dispatcher based on selected sound mode
    playClick() {
      if (this.soundMode === 'crystal') {
        this.playCrystalChime(1.0);
      } else if (this.soundMode === 'droplet') {
        this.playHydroDroplet();
      } else {
        this.playVelvetHaptic();
      }
    }

    playHydroChime(pitch = 1.0) {
      if (this.soundMode === 'crystal') {
        this.playCrystalChime(pitch);
      } else if (this.soundMode === 'droplet') {
        this.playHydroDroplet();
      } else {
        this.playVelvetHaptic();
      }
    }

    playTactileClick() {
      this.playVelvetHaptic();
    }

    setSoundMode(mode) {
      this.soundMode = mode;
      localStorage.setItem('furina_sound_profile', mode);
      if (mode !== 'off') {
        this.isEnabled = true;
        localStorage.setItem('furina_cozy_sounds', 'true');
        this.playClick();
      } else {
        this.isEnabled = false;
        localStorage.setItem('furina_cozy_sounds', 'false');
      }
    }

    toggle(enabled = null) {
      this.isEnabled = (enabled !== null) ? enabled : !this.isEnabled;
      localStorage.setItem('furina_cozy_sounds', String(this.isEnabled));
      if (this.isEnabled) {
        if (this.soundMode === 'off') this.soundMode = 'haptic';
        this.playClick();
      }
      return this.isEnabled;
    }

    setVolume(val) {
      this.volume = Math.max(0, Math.min(1, parseFloat(val) || 0.03));
      localStorage.setItem('furina_cozy_volume', String(this.volume));
    }

    initEventListeners() {
      document.addEventListener('click', (e) => {
        if (!this.isEnabled || this.soundMode === 'off') return;

        // Subtle cozy acoustic click on all navigation pills, tabs, mobile dock, dice, and controls
        const trigger = e.target.closest('.nav-item, .dock-item, .btn-primary, .control-btn-play, .search-pill, .bento-card, .spring-click, .btn-ctrl, .magic-shimmer-btn, .btn-random-repertoire, .mobile-nav-item, .card-item, .track-row, .btn-secondary, .btn-subtle, button, .theme-pill-dropdown-btn');
        if (trigger) {
          this.playClick();
        }
      }, { passive: true });
    }
  }

  window.furinaAudioEffects = new FurinaAudioEffects();

  window.updateSoundProfileUI = function () {
    const pill = document.getElementById('header-cozy-sound-pill');
    const label = document.getElementById('cozy-sound-label');
    const icon = document.getElementById('cozy-sound-icon');
    const isEnabled = localStorage.getItem('furina_cozy_sounds') !== 'false';
    const profile = localStorage.getItem('furina_sound_profile') || 'haptic';

    if (!isEnabled || profile === 'off') {
      if (label) label.textContent = 'Muted';
      if (icon) icon.textContent = '🔇';
      if (pill) pill.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    } else {
      if (profile === 'crystal') {
        if (label) label.textContent = 'Crystal Chime';
        if (icon) icon.textContent = '🎐';
      } else if (profile === 'droplet') {
        if (label) label.textContent = 'Hydro Drop';
        if (icon) icon.textContent = '💧';
      } else {
        if (label) label.textContent = 'Velvet Haptic';
        if (icon) icon.textContent = '✦';
      }
      if (pill) pill.style.borderColor = 'var(--accent-cyan)';
    }
  };

  window.cycleSoundProfile = function () {
    const modes = ['haptic', 'crystal', 'droplet', 'off'];
    const current = localStorage.getItem('furina_sound_profile') || 'haptic';
    const isEnabled = localStorage.getItem('furina_cozy_sounds') !== 'false';

    let nextIdx = (modes.indexOf(isEnabled ? current : 'off') + 1) % modes.length;
    let nextMode = modes[nextIdx];

    if (window.furinaAudioEffects) {
      window.furinaAudioEffects.setSoundMode(nextMode);
    } else {
      localStorage.setItem('furina_sound_profile', nextMode);
      localStorage.setItem('furina_cozy_sounds', nextMode !== 'off' ? 'true' : 'false');
    }

    window.updateSoundProfileUI();
    const readable = nextMode === 'off' ? 'Muted' : (nextMode === 'crystal' ? 'Crystal Chime' : (nextMode === 'droplet' ? 'Hydro Drop' : 'Velvet Haptic'));
    if (typeof showToast === 'function') {
      showToast(`✦ Sound Feedback: ${readable}`, 'info');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.updateSoundProfileUI();
  });
})();
