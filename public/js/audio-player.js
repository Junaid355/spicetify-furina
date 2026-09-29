/**
 * Furina Music — Unified Audio & Playback Engine with 10-Band Graphic Equalizer
 */
class FurinaAudioEngine {
  constructor() {
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.eqFilters = [];
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    this.canvasCtx = null;
    this.canvas = null;
    this.animationId = null;

    // Playback state
    this.currentTrack = null;
    this.isPlaying = false;
    this.queue = [];
    this.queueIndex = -1;
    this.shuffle = false;
    this.repeatMode = 'off'; // 'off' | 'all' | 'one'
    this.volume = 0.85;
    this.isMuted = false;

    // Listeners
    this.subscribers = new Set();

    this.initAudioListeners();
    this.initMediaSession();
  }

  initAudioContext() {
    if (!this.audioContext) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 128;

        // Build 10-Band Equalizer Biquad Filter Chain
        this.eqFilters = this.eqFrequencies.map((freq, i) => {
          const filter = this.audioContext.createBiquadFilter();
          if (i === 0) {
            filter.type = 'lowshelf';
          } else if (i === this.eqFrequencies.length - 1) {
            filter.type = 'highshelf';
          } else {
            filter.type = 'peaking';
            filter.Q.value = 1.4;
          }
          filter.frequency.value = freq;
          filter.gain.value = 0;
          return filter;
        });

        try {
          this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
          
          // Connect chain: source -> filter0 -> filter1 -> ... -> filter9 -> analyser -> destination
          let prevNode = this.sourceNode;
          for (const filter of this.eqFilters) {
            prevNode.connect(filter);
            prevNode = filter;
          }
          prevNode.connect(this.analyser);
          this.analyser.connect(this.audioContext.destination);
        } catch (e) {
          console.warn('[AudioContext] MediaElementSource binding notice:', e.message);
        }
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  setEqualizerBand(index, gainDb) {
    if (this.eqFilters[index]) {
      this.eqFilters[index].gain.value = gainDb;
    }
  }

  applyEqualizerPreset(presetName) {
    const presets = {
      flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bass_boost: [6, 5, 4, 2, 0, 0, 0, 0, 1, 2],
      opera_vocal: [-2, -1, 0, 2, 4, 5, 4, 2, 1, 0],
      classical: [3, 2, 1, 0, 0, 1, 2, 3, 3, 2],
      acoustic: [1, 2, 2, 1, 2, 3, 2, 2, 1, 1]
    };
    const gains = presets[presetName] || presets.flat;
    gains.forEach((g, i) => this.setEqualizerBand(i, g));
    return gains;
  }

  initAudioListeners() {
    this.audioElement.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audioElement.currentTime,
        duration: this.audioElement.duration || this.currentTrack?.durationMs / 1000 || 0,
        progress: (this.audioElement.currentTime / (this.audioElement.duration || 1)) * 100
      });
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.emit('statechange', { isPlaying: true });
      this.startVisualizer();
      if (window.dynamicBgEngine) window.dynamicBgEngine.triggerAudioPulse();
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.emit('statechange', { isPlaying: false });
      this.stopVisualizer();
    });

    this.audioElement.addEventListener('ended', () => {
      this.handleTrackEnded();
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('[AudioEngine] Playback error fallback:', e);
      this.emit('error', e);
    });
  }

  initMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.resume());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime) this.seek(details.seekTime);
      });
    }
  }

  updateMediaSessionMetadata(track) {
    if ('mediaSession' in navigator && track) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album || 'Furina Music',
        artwork: [
          { src: track.coverUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    }
  }

  async playTrack(track, queue = null) {
    if (!track) return;
    this.initAudioContext();

    if (queue) {
      this.queue = [...queue];
      this.queueIndex = this.queue.findIndex(t => t.id === track.id);
    } else if (this.queue.length === 0 || !this.queue.some(t => t.id === track.id)) {
      this.queue = [track];
      this.queueIndex = 0;
    } else {
      this.queueIndex = this.queue.findIndex(t => t.id === track.id);
    }

    // Normalize track metadata
    track.coverUrl = track.cover_url || track.coverUrl || './icons/app-icon.jpg';
    track.cover_url = track.coverUrl;
    track.durationMs = track.duration_ms || track.durationMs || 180000;
    track.duration_ms = track.durationMs;
    track.streamUrl = track.stream_url || track.streamUrl;
    track.stream_url = track.streamUrl;

    this.currentTrack = track;
    this.updateMediaSessionMetadata(track);

    // Update dynamic background from artwork
    if (window.dynamicBgEngine && track.coverUrl) {
      window.dynamicBgEngine.updateArtworkColors(track.coverUrl);
    }

    // Check if offline cached Blob exists
    if (window.furinaOfflineDB) {
      const offlineBlob = await window.furinaOfflineDB.getTrackBlob(track.id);
      if (offlineBlob) {
        console.log(`[AudioEngine] Playing authorized offline cached blob for: ${track.title}`);
        this.audioElement.src = URL.createObjectURL(offlineBlob);
        await this.audioElement.play();
        this.emit('trackchange', track);
        return;
      }
    }

    // Multi-source playback routing with dynamic stream resolver
    let streamToPlay = track.streamUrl || track.stream_url;

    if (!streamToPlay && track.title) {
      try {
        console.log(`[AudioEngine] Resolving live audio stream for: ${track.title} by ${track.artist}...`);
        const res = await fetch(`/api/catalog/resolve-audio?title=${encodeURIComponent(track.title)}&artist=${encodeURIComponent(track.artist || '')}`);
        if (res.ok) {
          const resolved = await res.json();
          if (resolved?.streamUrl) {
            streamToPlay = resolved.streamUrl;
            track.streamUrl = streamToPlay;
            track.stream_url = streamToPlay;
          }
        }
      } catch (_) {}

      // Direct fallback to Apple Music public catalog if backend proxy is unreachable
      if (!streamToPlay) {
        try {
          const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${track.title} ${track.artist || ''}`)}&entity=song&limit=1`);
          if (itRes.ok) {
            const itData = await itRes.json();
            if (itData.results?.[0]?.previewUrl) {
              streamToPlay = itData.results[0].previewUrl;
              track.streamUrl = streamToPlay;
              track.stream_url = streamToPlay;
            }
          }
        } catch (_) {}
      }
    }

    if (track.provider === 'spotify' && window.spotifyClient && window.spotifyClient.isReady && track.spotifyUri) {
      console.log(`[AudioEngine] Delegating playback to Spotify Web Playback SDK: ${track.spotifyUri}`);
      await window.spotifyClient.playUri(track.spotifyUri);
    } else {
      const finalAudioUrl = streamToPlay || './audio/la_vaguelette.wav';
      this.audioElement.src = finalAudioUrl;
      this.audioElement.load();
      try {
        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
      } catch (err) {
        console.warn('[AudioEngine] Play notice:', err.message);
        if (finalAudioUrl !== './audio/la_vaguelette.wav') {
          this.audioElement.src = './audio/la_vaguelette.wav';
          this.audioElement.load();
          await this.audioElement.play().catch(e => console.warn('[AudioEngine] Autoplay requires gesture:', e.message));
        }
      }
    }

    this.emit('trackchange', track);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.resume();
    }
  }

  pause() {
    this.audioElement.pause();
    if (window.spotifyClient && window.spotifyClient.isReady) {
      window.spotifyClient.pause();
    }
  }

  resume() {
    this.initAudioContext();
    this.audioElement.play().catch(err => console.warn('Audio resume error:', err));
  }

  seek(seconds) {
    if (this.audioElement.duration) {
      this.audioElement.currentTime = Math.max(0, Math.min(seconds, this.audioElement.duration));
    }
  }

  next() {
    if (this.queue.length === 0) return;
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.resume();
      return;
    }
    if (this.shuffle) {
      this.queueIndex = Math.floor(Math.random() * this.queue.length);
    } else {
      this.queueIndex++;
      if (this.queueIndex >= this.queue.length) {
        if (this.repeatMode === 'all') {
          this.queueIndex = 0;
        } else {
          this.queueIndex = this.queue.length - 1;
          this.pause();
          return;
        }
      }
    }
    this.playTrack(this.queue[this.queueIndex]);
  }

  prev() {
    if (this.audioElement.currentTime > 3) {
      this.seek(0);
      return;
    }
    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.playTrack(this.queue[this.queueIndex]);
    } else {
      this.seek(0);
    }
  }

  handleTrackEnded() {
    this.next();
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    this.emit('volumechange', { volume: this.volume, isMuted: this.isMuted });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audioElement.volume = this.isMuted ? 0 : this.volume;
    this.emit('volumechange', { volume: this.volume, isMuted: this.isMuted });
  }

  toggleShuffle() {
    this.shuffle = !this.shuffle;
    this.emit('shufflechange', this.shuffle);
  }

  cycleRepeat() {
    const modes = ['off', 'all', 'one'];
    const nextIdx = (modes.indexOf(this.repeatMode) + 1) % modes.length;
    this.repeatMode = modes[nextIdx];
    this.emit('repeatchange', this.repeatMode);
  }

  bindCanvas(canvasElement) {
    this.canvas = canvasElement;
    if (this.canvas) {
      this.canvasCtx = this.canvas.getContext('2d');
    }
  }

  startVisualizer() {
    if (!this.canvas || !this.analyser) return;
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      this.animationId = requestAnimationFrame(render);
      this.analyser.getByteFrequencyData(dataArray);

      const width = this.canvas.width;
      const height = this.canvas.height;
      this.canvasCtx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.95;
        const grad = this.canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(0.6, '#38bdf8');
        grad.addColorStop(1, '#f6d89b');

        this.canvasCtx.fillStyle = grad;
        this.canvasCtx.beginPath();
        this.canvasCtx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [3, 3, 0, 0]);
        this.canvasCtx.fill();

        x += barWidth;
      }
    };
    render();
  }

  stopVisualizer() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.canvasCtx && this.canvas) {
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  emit(event, data) {
    for (const sub of this.subscribers) {
      try { sub(event, data); } catch (e) { console.error(e); }
    }
  }
}

window.furinaAudio = new FurinaAudioEngine();
