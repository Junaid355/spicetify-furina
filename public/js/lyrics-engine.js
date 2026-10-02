/**
 * Furina Music — Synced Lyrics & Translation Engine
 * Parses LRC files with millisecond precision, synchronizes active lines with 3D perspective,
 * and provides live multilingual-to-English translation.
 */
class FurinaLyricsEngine {
  constructor() {
    this.lines = [];
    this.currentLineIndex = -1;
    this.container = null;
    this.isTranslationEnabled = localStorage.getItem('furina_lyrics_translate') === 'true';
    this.translations = {};
    this.currentTrackKey = '';
    this.isTranslating = false;
  }

  parseLRC(lrcText, trackKey = '') {
    const key = trackKey || window.furinaAudio?.currentTrack?.id || window.furinaAudio?.currentTrack?.title || '';
    if (key && key !== this.currentTrackKey) {
      this.translations = {};
      this.currentTrackKey = key;
      this.isTranslating = false;
    }

    if (!lrcText) {
      this.lines = [];
      return [];
    }

    const lines = lrcText.split('\n');
    const parsed = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      let match;
      timeRegex.lastIndex = 0;
      const text = line.replace(timeRegex, '').trim();

      timeRegex.lastIndex = 0;
      let hasTimestamp = false;
      while ((match = timeRegex.exec(line)) !== null) {
        hasTimestamp = true;
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;
        parsed.push({ time: totalSeconds, text });
      }

      // Handle unsynced plain lyrics lines gracefully
      if (!hasTimestamp && text) {
        parsed.push({ time: parsed.length * 4, text });
      }
    }

    parsed.sort((a, b) => a.time - b.time);
    this.lines = parsed;
    return this.lines;
  }

  render(containerElement, onSeek = null) {
    this.container = containerElement;
    if (!this.container) return;
    this.container.innerHTML = '';

    // Update container state for translation visibility
    if (this.isTranslationEnabled) {
      this.container.classList.add('show-translation');
    } else {
      this.container.classList.remove('show-translation');
    }
    this.updateToggleButtonUI();

    if (this.lines.length === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; color: var(--text-dim); margin-top: 60px;">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">✦ Fontaine Opera Epiclese ✦</p>
          <p style="font-size: 0.85rem;">Instrumental resonance or no synchronized lyrics available.</p>
        </div>
      `;
      return;
    }

    this.lines.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'lyric-line';
      el.dataset.index = index;
      el.dataset.time = item.time;

      const origEl = document.createElement('div');
      origEl.className = 'lyric-original';
      origEl.textContent = item.text || '♪';
      el.appendChild(origEl);

      const transEl = document.createElement('div');
      transEl.className = 'lyric-translation';
      transEl.dataset.index = index;
      transEl.textContent = this.translations[index] || '';
      el.appendChild(transEl);

      el.addEventListener('click', () => {
        if (onSeek) onSeek(item.time);
      });

      this.container.appendChild(el);
    });

    // If translation is turned on, fetch translations in background
    if (this.isTranslationEnabled && Object.keys(this.translations).length === 0) {
      this.fetchTranslations();
    }

    // Initial 3D depth distribution
    this.apply3DPerspective(0);
  }

  updateToggleButtonUI() {
    const btn = document.getElementById('btn-toggle-translation');
    const label = document.getElementById('btn-translation-label');
    if (btn) {
      btn.classList.toggle('active', !!this.isTranslationEnabled);
    }
    if (label) {
      label.textContent = this.isTranslationEnabled ? 'Translation: ON' : 'Translate (EN)';
    }
  }

  toggleTranslation() {
    this.isTranslationEnabled = !this.isTranslationEnabled;
    try {
      localStorage.setItem('furina_lyrics_translate', String(this.isTranslationEnabled));
    } catch (_) {}

    if (this.container) {
      this.container.classList.toggle('show-translation', this.isTranslationEnabled);
    }
    this.updateToggleButtonUI();

    if (this.isTranslationEnabled && Object.keys(this.translations).length === 0) {
      this.fetchTranslations();
    }
  }

  async fetchTranslations() {
    if (!this.lines || this.lines.length === 0 || this.isTranslating) return;
    this.isTranslating = true;

    try {
      const validIndices = [];
      const textsToTranslate = [];

      this.lines.forEach((line, idx) => {
        const txt = (line.text || '').trim();
        if (txt && txt !== '♪' && !this.translations[idx]) {
          validIndices.push(idx);
          textsToTranslate.push(txt);
        }
      });

      if (textsToTranslate.length === 0) {
        this.isTranslating = false;
        return;
      }

      // Process in batches of up to 35 lines to prevent URL overflow
      const batchSize = 35;
      for (let i = 0; i < textsToTranslate.length; i += batchSize) {
        const batchTexts = textsToTranslate.slice(i, i + batchSize);
        const batchIndices = validIndices.slice(i, i + batchSize);
        const joined = batchTexts.join('\n');

        try {
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(joined)}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const translatedBlock = data[0].map(item => item[0]).join('');
            const translatedLines = translatedBlock.split('\n');

            batchIndices.forEach((lineIndex, offset) => {
              const trans = (translatedLines[offset] || '').trim();
              if (trans) {
                this.translations[lineIndex] = trans;
                if (this.container) {
                  const el = this.container.querySelector(`.lyric-translation[data-index="${lineIndex}"]`);
                  if (el) {
                    el.textContent = trans;
                  }
                }
              }
            });
          }
        } catch (batchErr) {
          console.warn('[FurinaLyrics] Translation batch failed:', batchErr);
        }
      }
    } catch (err) {
      console.warn('[FurinaLyrics] Translation process error:', err);
    } finally {
      this.isTranslating = false;
    }
  }

  apply3DPerspective(activeIndex) {
    if (!this.container) return;
    const lines = Array.from(this.container.children).filter(c => c.classList.contains('lyric-line'));
    lines.forEach((lineEl, i) => {
      if (i === activeIndex) {
        lineEl.classList.add('active');
        lineEl.style.transform = 'perspective(600px) translateZ(32px) scale(1.1) rotateX(0deg)';
        lineEl.style.opacity = '1';
        lineEl.style.filter = 'blur(0px)';
      } else {
        lineEl.classList.remove('active');
        const dist = Math.abs(i - activeIndex);
        if (dist === 1) {
          lineEl.style.transform = `perspective(600px) translateZ(4px) scale(0.98) rotateX(${i < activeIndex ? -2 : 2}deg)`;
          lineEl.style.opacity = '0.55';
          lineEl.style.filter = 'blur(0.2px)';
        } else if (dist === 2) {
          lineEl.style.transform = `perspective(600px) translateZ(-6px) scale(0.95) rotateX(${i < activeIndex ? -4 : 4}deg)`;
          lineEl.style.opacity = '0.35';
          lineEl.style.filter = 'blur(0.4px)';
        } else {
          lineEl.style.transform = `perspective(600px) translateZ(-14px) scale(0.92) rotateX(${i < activeIndex ? -6 : 6}deg)`;
          lineEl.style.opacity = '0.18';
          lineEl.style.filter = 'blur(0.6px)';
        }
      }
    });
  }

  update(currentTime) {
    if (!this.container || this.lines.length === 0) return;

    let activeIndex = -1;
    for (let i = 0; i < this.lines.length; i++) {
      if (currentTime >= this.lines[i].time - 0.25) {
        activeIndex = i;
      } else {
        break;
      }
    }

    if (activeIndex !== this.currentLineIndex) {
      this.currentLineIndex = activeIndex;
      this.apply3DPerspective(activeIndex);

      if (activeIndex >= 0) {
        const newActive = this.container.children[activeIndex];
        if (newActive) {
          // Smooth scroll to center
          const containerHeight = this.container.clientHeight;
          const lineOffset = newActive.offsetTop;
          const lineHeight = newActive.clientHeight;
          this.container.scrollTo({
            top: lineOffset - containerHeight / 2 + lineHeight / 2,
            behavior: 'smooth'
          });
        }
      }
    }
  }
}

window.furinaLyrics = new FurinaLyricsEngine();
