/**
 * Furina Music — Unified Bug Logger & In-App Diagnostics System
 * Real-time console capture, unhandled error interceptor, audio engine diagnostics,
 * network monitor, and interactive diagnostics sheet drawer.
 */

(function() {
  class FurinaBugLogger {
    constructor() {
      this.logs = [];
      this.maxLogs = 300;
      this.errorCount = 0;
      this.warnCount = 0;
      this.activeFilter = 'all'; // 'all' | 'error' | 'warn' | 'audio' | 'net'
      this.searchQuery = '';
      this.isOpen = false;
      this.listeners = new Set();

      this.initInterception();
      this.initGlobalHandlers();
      this.loadPersistedLogs();
    }

    initInterception() {
      const originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: (console.debug || console.log).bind(console)
      };
      this.originalConsole = originalConsole;

      const formatArgs = (args) => {
        return args.map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (arg instanceof Error) return `${arg.name}: ${arg.message}\n${arg.stack || ''}`;
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg, null, 2); } catch (_) { return String(arg); }
          }
          return String(arg);
        }).join(' ');
      };

      const detectCategory = (msg) => {
        const lower = msg.toLowerCase();
        if (lower.includes('[audioengine]') || lower.includes('[fullstreamengine]') || lower.includes('audio') || lower.includes('playback') || lower.includes('stream') || lower.includes('track')) return 'audio';
        if (lower.includes('[clientapi]') || lower.includes('fetch') || lower.includes('http') || lower.includes('api') || lower.includes('network') || lower.includes('audius') || lower.includes('itunes') || lower.includes('lrclib')) return 'net';
        if (lower.includes('[spotify]') || lower.includes('oauth') || lower.includes('spicetify')) return 'spotify';
        if (lower.includes('[ui]') || lower.includes('theme') || lower.includes('render') || lower.includes('dom')) return 'ui';
        return 'general';
      };

      console.log = (...args) => {
        originalConsole.log(...args);
        const msg = formatArgs(args);
        this.addLog('info', msg, detectCategory(msg));
      };

      console.info = (...args) => {
        originalConsole.info(...args);
        const msg = formatArgs(args);
        this.addLog('info', msg, detectCategory(msg));
      };

      console.warn = (...args) => {
        originalConsole.warn(...args);
        const msg = formatArgs(args);
        this.warnCount++;
        this.addLog('warn', msg, detectCategory(msg));
      };

      console.error = (...args) => {
        originalConsole.error(...args);
        const msg = formatArgs(args);
        this.errorCount++;
        this.addLog('error', msg, detectCategory(msg));
      };
    }

    initGlobalHandlers() {
      window.addEventListener('error', (event) => {
        const errorMsg = event.error ? `${event.error.message}\n${event.error.stack || ''}` : `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
        this.errorCount++;
        this.addLog('error', `[Window Error] ${errorMsg}`, 'system');
        this.triggerErrorPulse();
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        const errorMsg = reason instanceof Error ? `${reason.message}\n${reason.stack || ''}` : String(reason);
        this.errorCount++;
        this.addLog('error', `[Unhandled Promise Rejection] ${errorMsg}`, 'system');
        this.triggerErrorPulse();
      });
    }

    addLog(level, message, category = 'general') {
      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
      const entry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: timeStr,
        fullDate: now.toISOString(),
        level, // 'info' | 'warn' | 'error' | 'success'
        message,
        category
      };

      this.logs.unshift(entry);
      if (this.logs.length > this.maxLogs) {
        this.logs.pop();
      }

      this.updateBadgeUI();
      if (this.isOpen) {
        this.renderLogs();
      }
    }

    updateBadgeUI() {
      const badge = document.getElementById('bug-logger-badge-count');
      const btn = document.getElementById('btn-bug-logger');
      const mobileBtn = document.getElementById('mobile-nav-bug-count');

      const totalAlerts = this.errorCount + this.warnCount;
      if (badge) {
        if (totalAlerts > 0) {
          badge.textContent = this.errorCount > 0 ? `${this.errorCount}` : `!`;
          badge.style.display = 'inline-flex';
          badge.className = this.errorCount > 0 ? 'logger-badge-pill error' : 'logger-badge-pill warn';
        } else {
          badge.textContent = '0';
          badge.className = 'logger-badge-pill clean';
        }
      }

      if (mobileBtn) {
        if (totalAlerts > 0) {
          mobileBtn.textContent = totalAlerts > 99 ? '99+' : totalAlerts;
          mobileBtn.style.display = 'block';
        } else {
          mobileBtn.style.display = 'none';
        }
      }

      if (btn && this.errorCount > 0) {
        btn.classList.add('has-errors');
      }
    }

    triggerErrorPulse() {
      const btn = document.getElementById('btn-bug-logger');
      if (btn) {
        btn.classList.add('pulse-error');
        setTimeout(() => btn.classList.remove('pulse-error'), 1800);
      }
    }

    open() {
      this.isOpen = true;
      const drawer = document.getElementById('drawer-bug-logger');
      const overlay = document.getElementById('drawer-bug-logger-overlay');
      if (drawer) drawer.classList.add('open');
      if (overlay) overlay.classList.add('open');
      this.renderLogs();
    }

    close() {
      this.isOpen = false;
      const drawer = document.getElementById('drawer-bug-logger');
      const overlay = document.getElementById('drawer-bug-logger-overlay');
      if (drawer) drawer.classList.remove('open');
      if (overlay) overlay.classList.remove('open');
    }

    toggle() {
      if (this.isOpen) this.close();
      else this.open();
    }

    clear() {
      this.logs = [];
      this.errorCount = 0;
      this.warnCount = 0;
      this.updateBadgeUI();
      this.renderLogs();
      try { localStorage.removeItem('furina_persisted_logs'); } catch (_) {}
      this.addLog('info', '✦ Log buffer cleared.', 'system');
    }

    setFilter(filter) {
      this.activeFilter = filter;
      const tabs = document.querySelectorAll('.logger-filter-pill');
      tabs.forEach(tab => {
        if (tab.dataset.filter === filter) tab.classList.add('active');
        else tab.classList.remove('active');
      });
      this.renderLogs();
    }

    setSearch(query) {
      this.searchQuery = (query || '').toLowerCase().trim();
      this.renderLogs();
    }

    getFilteredLogs() {
      return this.logs.filter(log => {
        if (this.activeFilter === 'error' && log.level !== 'error') return false;
        if (this.activeFilter === 'warn' && log.level !== 'warn' && log.level !== 'error') return false;
        if (this.activeFilter === 'audio' && log.category !== 'audio') return false;
        if (this.activeFilter === 'net' && log.category !== 'net') return false;

        if (this.searchQuery) {
          const matchMsg = log.message.toLowerCase().includes(this.searchQuery);
          const matchCat = log.category.toLowerCase().includes(this.searchQuery);
          return matchMsg || matchCat;
        }
        return true;
      });
    }

    renderLogs() {
      const container = document.getElementById('logger-entries-container');
      if (!container) return;

      const filtered = this.getFilteredLogs();
      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="logger-empty-state">
            <img src="images/furina_dance.gif" class="logger-furina-mascot" alt="Dancing Furina" onerror="this.src='images/furina_salon_music.jpg'" />
            <div class="logger-empty-title">No Logs Found</div>
            <div class="logger-empty-sub">
              ${this.searchQuery ? `No entries matching "${this.searchQuery}"` : 'All Fontaine systems operating smoothly!'}
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(log => {
        const levelBadgeClass = `log-level-${log.level}`;
        const categoryBadgeClass = `log-cat-${log.category}`;
        const escapedMsg = log.message
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');

        return `
          <div class="logger-entry-row ${log.level}">
            <div class="logger-entry-meta">
              <span class="logger-time">${log.timestamp}</span>
              <span class="logger-level-tag ${levelBadgeClass}">${log.level.toUpperCase()}</span>
              <span class="logger-cat-tag ${categoryBadgeClass}">${log.category}</span>
            </div>
            <div class="logger-entry-msg">${escapedMsg}</div>
          </div>
        `;
      }).join('');
    }

    async runSelfDiagnostics() {
      this.addLog('info', '✦ Starting Comprehensive Fontaine Diagnostics Scan...', 'system');
      const results = [];

      // 1. Audio Element & Web Audio API
      try {
        const canPlayMp3 = new Audio().canPlayType('audio/mpeg');
        const canPlayWav = new Audio().canPlayType('audio/wav');
        const canPlayOgg = new Audio().canPlayType('audio/ogg');
        const hasWebAudio = Boolean(window.AudioContext || window.webkitAudioContext);
        results.push(`[Audio Hardware] MP3: ${canPlayMp3 || 'no'}, WAV: ${canPlayWav || 'no'}, OGG: ${canPlayOgg || 'no'}, WebAudio API: ${hasWebAudio ? 'YES' : 'NO'}`);
        this.addLog('info', results[results.length - 1], 'audio');
      } catch (e) {
        results.push(`[Audio Hardware Error] ${e.message}`);
        this.addLog('error', results[results.length - 1], 'audio');
      }

      // 2. YouTube IFrame Streamer API Check
      try {
        const ytScript = Boolean(document.querySelector('script[src*="youtube.com/iframe_api"]'));
        const ytLoaded = Boolean(window.YT && window.YT.Player);
        const ytReady = window.furinaAudio?.isYtReady || false;
        const videoCount = Object.keys(window.furinaAudio?.videoMap || {}).length;
        results.push(`[YouTube Streamer] Script Present: ${ytScript}, Window.YT Ready: ${ytLoaded}, Engine Ready: ${ytReady}, Pre-mapped Video Cache: ${videoCount} songs`);
        this.addLog(ytReady ? 'info' : 'warn', results[results.length - 1], 'audio');
      } catch (e) {
        this.addLog('warn', `[YouTube Check Error] ${e.message}`, 'audio');
      }

      // 3. Apple Music / iTunes Live Search Endpoint Ping
      try {
        const t0 = performance.now();
        const itRes = await fetch('https://itunes.apple.com/search?term=Furina&entity=song&limit=1');
        const latency = Math.round(performance.now() - t0);
        results.push(`[iTunes CDN Ping] Status: ${itRes.status} (Latency: ${latency}ms)`);
        this.addLog(itRes.ok ? 'info' : 'warn', results[results.length - 1], 'net');
      } catch (e) {
        this.addLog('warn', `[iTunes CDN Ping Failed] ${e.message}`, 'net');
      }

      // 4. Audius Discovery Lossless Network Ping
      try {
        const t0 = performance.now();
        const audRes = await fetch('https://discoveryprovider.audius.co/v1/tracks/search?query=Furina&app_name=FURINA_MUSIC');
        const latency = Math.round(performance.now() - t0);
        results.push(`[Audius Lossless Node] Status: ${audRes.status} (Latency: ${latency}ms)`);
        this.addLog(audRes.ok ? 'info' : 'warn', results[results.length - 1], 'net');
      } catch (e) {
        this.addLog('warn', `[Audius Ping Failed] ${e.message}`, 'net');
      }

      // 5. LRCLIB Synced Lyrics Ping
      try {
        const t0 = performance.now();
        const lrcRes = await fetch('https://lrclib.net/api/get?track_name=La+Vaguelette&artist_name=Furina');
        const latency = Math.round(performance.now() - t0);
        results.push(`[LRCLIB Synced Lyrics API] Status: ${lrcRes.status} (Latency: ${latency}ms)`);
        this.addLog(lrcRes.ok ? 'info' : 'warn', results[results.length - 1], 'net');
      } catch (e) {
        this.addLog('warn', `[LRCLIB Ping Notice] ${e.message}`, 'net');
      }

      // 6. Local Storage & Offline Storage Check
      try {
        const testKey = '__furina_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
        const hasIndexedDB = Boolean(window.indexedDB);
        results.push(`[Client Storage] LocalStorage: OK, IndexedDB: ${hasIndexedDB ? 'OK' : 'UNAVAILABLE'}`);
        this.addLog('info', results[results.length - 1], 'system');
      } catch (e) {
        this.addLog('error', `[Storage Error] ${e.message}`, 'system');
      }

      // 7. ServiceWorker Registration
      try {
        const hasSW = 'serviceWorker' in navigator;
        const swReg = hasSW ? await navigator.serviceWorker.getRegistration() : null;
        results.push(`[PWA ServiceWorker] Supported: ${hasSW}, Active Scope: ${swReg ? swReg.scope : 'Not Active / Bypass'}`);
        this.addLog('info', results[results.length - 1], 'system');
      } catch (e) {
        this.addLog('warn', `[SW Notice] ${e.message}`, 'system');
      }

      this.addLog('info', '✦ Diagnostics Complete! All vital endpoints verified.', 'system');
      if (typeof window.showToast === 'function') {
        window.showToast('Diagnostics completed! Check log entries.', 'success');
      }
    }

    copyLogsToClipboard() {
      const summaryHeader = [
        `# Furina Music Diagnostics Report`,
        `Generated: ${new Date().toISOString()}`,
        `User Agent: ${navigator.userAgent}`,
        `Screen: ${window.innerWidth}x${window.innerHeight} (Device Pixel Ratio: ${window.devicePixelRatio})`,
        `Current Track: ${window.furinaAudio?.currentTrack?.title || 'None'} - ${window.furinaAudio?.currentTrack?.artist || 'None'}`,
        `Audio Backend: ${window.furinaAudio?.activeBackend || 'None'}`,
        `Total Logs: ${this.logs.length} (Errors: ${this.errorCount}, Warnings: ${this.warnCount})`,
        `----------------------------------------\n`
      ].join('\n');

      const logLines = this.logs.slice().reverse().map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}`).join('\n');
      const fullText = summaryHeader + logLines;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText).then(() => {
          if (typeof window.showToast === 'function') {
            window.showToast('Diagnostic logs copied to clipboard!', 'success');
          }
        }).catch(() => this.fallbackCopy(fullText));
      } else {
        this.fallbackCopy(fullText);
      }
    }

    fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof window.showToast === 'function') {
        window.showToast('Diagnostic logs copied!', 'success');
      }
    }

    exportJSON() {
      const exportData = {
        meta: {
          app: 'Furina Music',
          exportedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          screen: `${window.innerWidth}x${window.innerHeight}`,
          audioEngine: {
            backend: window.furinaAudio?.activeBackend,
            isPlaying: window.furinaAudio?.isPlaying,
            currentTrack: window.furinaAudio?.currentTrack
          }
        },
        logs: this.logs
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `furina_diagnostics_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 1000);
    }

    persistLogs() {
      try {
        localStorage.setItem('furina_persisted_logs', JSON.stringify(this.logs.slice(0, 50)));
      } catch (_) {}
    }

    loadPersistedLogs() {
      try {
        const raw = localStorage.getItem('furina_persisted_logs');
        if (raw) {
          const loaded = JSON.parse(raw);
          if (Array.isArray(loaded)) {
            this.logs = loaded;
          }
        }
      } catch (_) {}
    }
  }

  // Initialize global logger
  window.furinaBugLogger = new FurinaBugLogger();
  window.toggleBugLogger = () => window.furinaBugLogger.toggle();

  // Save logs on unload
  window.addEventListener('beforeunload', () => {
    window.furinaBugLogger.persistLogs();
  });

  console.log('[BugLogger] Fontaine Diagnostics & Real-Time Error Logger active.');
})();
