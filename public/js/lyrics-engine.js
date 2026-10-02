/**
 * Furina Music — Synced Lyrics & Translation Engine
 * Parses LRC files with millisecond precision, synchronizes active lines with 3D perspective,
 * provides live multilingual-to-English translation, and supports instant song version switching.
 */

const BUNDLED_CANONICAL_LYRICS = {
  indila_love_story: `[00:00.00] ♪
[00:15.26] L'âme en peine, il vit mais parle à peine
[00:22.88] Il attend devant cette photo d'antan
[00:29.37] Il, il n'est pas fou, il y croit, c'est tout
[00:33.92] Il la voit partout, il l'attend debout
[00:37.72] Une rose à la main, ah, à part elle, il n'attend rien
[00:45.07] Rien autour n'a de sens et l'air est lourd
[00:52.06] Le regard absent, il est seul et lui parle souvent
[00:59.14] Il, il n'est pas fou, il l'aime, c'est tout
[01:03.76] Il la voit partout, il l'attend debout
[01:07.21] Debout, une rose à la main, non, non, plus rien ne le retient
[01:13.56] Dans sa love story
[01:17.38] Dans sa love story
[01:21.06] Dans sa love story
[01:25.25] Sa love story
[01:30.13] Prends ma main, promets-moi que tout ira bien
[01:37.44] Serre-moi fort, près de toi, je rêve encore
[01:44.10] Oui, oui, je veux rester, mais, je n'sais plus aimer
[01:48.38] J'ai été trop bête, je t'en prie, arrête
[01:52.34] Arrête, comme je regrette, non, je ne voulais pas tout ça
[02:00.29] Je serai riche et je t'offrirai tout mon or
[02:04.13] Si tu t'en fiches, je t'attendrai sur le port
[02:07.88] Et si tu m'ignores, je t'offrirai mon dernier souffle de vie
[02:13.81] Dans ma love story
[02:17.36] Dans ma love story
[02:21.05] Dans ma love story
[02:25.16] Ma love story
[02:30.13] Une bougie peut illuminer la nuit
[02:37.65] Un sourire peut bâtir tout un empire
[02:44.03] Et il y a toi, et il y a moi
[02:48.52] Et personne n'y croit, mais l'amour fait d'un fou un roi
[02:52.74] Et si tu m'ignores, j'me battrai encore et encore
[02:58.50] C'est ta love story
[03:02.20] C'est ta love story
[03:06.01] C'est l'histoire d'une vie
[03:10.42] Love story
[03:14.08] ♪
[04:15.03] Des cris de joie, quelques larmes, on s'en va
[04:22.59] On vit dans cette love story
[04:30.18] Love story, love story
[04:37.67] Love story, love story
[04:45.15] Love story, love story
[04:52.60] Love story, love story
[05:00.13] Love story, love story
[05:07.29] ♪`,

  taylor_love_story: `[00:00.00] ♪
[00:17.44] We were both young when I first saw you
[00:21.38] I close my eyes and the flashback starts
[00:24.84] I'm standing there
[00:27.94] On a balcony, in summer air
[00:33.50] See the lights, see the party, the ball gowns
[00:37.89] See you make your way through the crowd
[00:41.35] And say, "Hello"
[00:44.40] Little did I know
[00:49.00] That you were Romeo, you were throwin' pebbles
[00:52.92] And my daddy said, "Stay away from Juliet"
[00:57.18] And I was cryin' on the staircase
[01:00.08] Beggin' you, "Please don't go"
[01:04.14] And I said, "Romeo, take me somewhere we can be alone
[01:10.38] I'll be waiting, all there's left to do is run
[01:14.50] You'll be the prince and I'll be the princess
[01:18.66] It's a love story, baby, just say, 'Yes'"
[01:25.56] So I sneak out to the garden to see you
[01:29.80] We keep quiet, 'cause we're dead if they knew
[01:33.30] So close your eyes
[01:36.10] Escape this town for a little while
[01:40.85] 'Cause you were Romeo, I was a scarlet letter
[01:45.02] And my daddy said, "Stay away from Juliet"
[01:49.20] But you were everything to me
[01:52.12] I was beggin' you, "Please don't go"
[01:56.24] And I said, "Romeo, take me somewhere we can be alone
[02:02.40] I'll be waiting, all there's left to do is run
[02:06.50] You'll be the prince and I'll be the princess
[02:10.60] It's a love story, baby, just say, 'Yes'"
[02:15.80] Romeo, save me, they're tryna tell me how to feel
[02:20.90] This love is difficult, but it's real
[02:25.10] Don't be afraid, we'll make it out of this mess
[02:29.20] It's a love story, baby, just say, 'Yes'
[02:35.00] Oh, oh
[02:40.00] I got tired of waiting
[02:43.00] Wonderin' if you were ever comin' around
[02:47.10] My faith in you was fading
[02:50.00] When I met you on the outskirts of town
[02:54.10] And I said, "Romeo, save me, I've been feeling so alone
[03:00.20] I keep waiting for you, but you never come
[03:04.40] Is this in my head? I don't know what to think"
[03:08.50] He knelt to the ground and pulled out a ring and said
[03:13.20] "Marry me, Juliet, you'll never have to be alone
[03:19.40] I love you and that's all I really know
[03:23.50] I talked to your dad, go pick out a white dress
[03:27.70] It's a love story, baby, just say, 'Yes'"
[03:34.00] Oh, oh, oh
[03:40.00] 'Cause we were both young when I first saw you`
};

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

  getBundledLyrics(trackTitle, artistName) {
    const cleanTitle = (trackTitle || '').toLowerCase().replace(/[\(\[].*?[\)\]]/g, '').trim();
    const cleanArtist = (artistName || '').toLowerCase().trim();

    if (cleanTitle === 'love story') {
      if (cleanArtist.includes('taylor') || cleanArtist.includes('swift')) {
        return BUNDLED_CANONICAL_LYRICS.taylor_love_story;
      }
      return BUNDLED_CANONICAL_LYRICS.indila_love_story;
    }
    return null;
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
    this.updateVersionButtonUI();

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

  updateVersionButtonUI() {
    const btn = document.getElementById('btn-toggle-version');
    const label = document.getElementById('btn-version-label');
    if (!btn) return;

    const cur = window.furinaAudio?.currentTrack;
    const cleanTitle = (cur?.title || '').toLowerCase().replace(/[\(\[].*?[\)\]]/g, '').trim();

    if (cleanTitle === 'love story') {
      btn.style.display = 'inline-flex';
      const isTaylor = (cur?.artist || '').toLowerCase().includes('taylor') || (cur?.artist || '').toLowerCase().includes('swift');
      if (label) {
        label.textContent = isTaylor ? 'Switch to Indila' : 'Switch to Taylor Swift';
      }
    } else {
      btn.style.display = 'none';
    }
  }

  switchSongVersion() {
    const cur = window.furinaAudio?.currentTrack;
    if (!cur) return;
    const cleanTitle = (cur.title || '').toLowerCase().replace(/[\(\[].*?[\)\]]/g, '').trim();

    if (cleanTitle === 'love story') {
      const isIndila = (cur.artist || '').toLowerCase().includes('indila');
      if (isIndila) {
        // Switch to Taylor Swift
        const newTrack = {
          ...cur,
          title: 'Love Story',
          artist: 'Taylor Swift',
          album: 'Fearless (Taylor\'s Version)',
          youtubeId: '8xg3vE8Ie_E',
          videoId: '8xg3vE8Ie_E',
          streamUrl: null,
          stream_url: null
        };
        if (window.furinaAudio) {
          window.furinaAudio.currentTrack = newTrack;
          window.furinaAudio.executeYouTubePlay('8xg3vE8Ie_E', newTrack);
        }
        // Update labels on screen
        const stageTitle = document.getElementById('stage-track-title');
        const stageArtist = document.getElementById('stage-track-artist');
        if (stageTitle) stageTitle.textContent = 'Love Story';
        if (stageArtist) stageArtist.textContent = 'Taylor Swift';

        const playerTitle = document.getElementById('player-track-title');
        const playerArtist = document.getElementById('player-track-artist');
        if (playerTitle) playerTitle.textContent = 'Love Story';
        if (playerArtist) playerArtist.textContent = 'Taylor Swift';

        this.parseLRC(BUNDLED_CANONICAL_LYRICS.taylor_love_story, 'taylor_love_story');
        this.render(this.container, (seekSec) => window.furinaAudio?.seek(seekSec));
        this.updateVersionButtonUI();
        if (typeof showToast === 'function') {
          showToast('Switched to Taylor Swift — Love Story', 'success');
        }
      } else {
        // Switch to Indila
        const newTrack = {
          ...cur,
          title: 'Love Story',
          artist: 'Indila',
          album: 'Mini World',
          youtubeId: 'jfjEsGiFyuU',
          videoId: 'jfjEsGiFyuU',
          streamUrl: null,
          stream_url: null
        };
        if (window.furinaAudio) {
          window.furinaAudio.currentTrack = newTrack;
          window.furinaAudio.executeYouTubePlay('jfjEsGiFyuU', newTrack);
        }
        const stageTitle = document.getElementById('stage-track-title');
        const stageArtist = document.getElementById('stage-track-artist');
        if (stageTitle) stageTitle.textContent = 'Love Story';
        if (stageArtist) stageArtist.textContent = 'Indila';

        const playerTitle = document.getElementById('player-track-title');
        const playerArtist = document.getElementById('player-track-artist');
        if (playerTitle) playerTitle.textContent = 'Love Story';
        if (playerArtist) playerArtist.textContent = 'Indila';

        this.parseLRC(BUNDLED_CANONICAL_LYRICS.indila_love_story, 'indila_love_story');
        this.render(this.container, (seekSec) => window.furinaAudio?.seek(seekSec));
        this.updateVersionButtonUI();
        if (typeof showToast === 'function') {
          showToast('Switched to Indila — Love Story (French)', 'success');
        }
      }
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
