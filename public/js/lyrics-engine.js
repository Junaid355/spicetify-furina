/**
 * Furina Music — Synced Lyrics Engine
 * Parses LRC files with millisecond precision and synchronizes active lines.
 */
class FurinaLyricsEngine {
  constructor() {
    this.lines = [];
    this.currentLineIndex = -1;
    this.container = null;
  }

  parseLRC(lrcText) {
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
      while ((match = timeRegex.exec(line)) !== null) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;
        parsed.push({ time: totalSeconds, text });
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
      el.textContent = item.text || '♪';

      el.addEventListener('click', () => {
        if (onSeek) onSeek(item.time);
      });

      this.container.appendChild(el);
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
      const oldActive = this.container.querySelector('.lyric-line.active');
      if (oldActive) oldActive.classList.remove('active');

      this.currentLineIndex = activeIndex;

      if (activeIndex >= 0) {
        const newActive = this.container.children[activeIndex];
        if (newActive) {
          newActive.classList.add('active');
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
