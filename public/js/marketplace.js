/**
 * Furina Music — Spicetify-Inspired Marketplace & Customization Manager
 */
class FurinaMarketplace {
  constructor() {
    this.currentCategory = 'themes';
    this.feed = null;
  }

  async loadFeed() {
    try {
      const res = await fetch('/api/marketplace');
      if (res.ok) {
        const data = await res.json();
        if (data && (Array.isArray(data.themes) || Array.isArray(data.extensions) || Array.isArray(data.apps))) {
          this.feed = data;
        }
      }
    } catch (err) {
      console.warn('[Marketplace] Fetch notice, using resilient fallback feed:', err);
    }
    if (!this.feed || !Array.isArray(this.feed.themes)) {
      this.feed = this.getDefaultFeed();
    }
    this.render();
  }

  getDefaultFeed() {
    const activeTheme = localStorage.getItem('furina_theme') || 'furina-fontaine';
    return {
      themes: [
        { id: 'theme-furina-ocean', code: 'furina-fontaine', name: 'Furina Ocean (Fontaine Royal)', category: 'themes', author: 'Furina Archon Team', version: '2.5.0', description: 'Deep ocean abyss with luminous cyan & royal gold accents.', accentColor: '#38bdf8', previewColor: '#060d1b', active: activeTheme === 'furina-fontaine' },
        { id: 'theme-focalors-divine', code: 'furina-focalors', name: 'Focalors Divine Judgment', category: 'themes', author: 'Opera Epiclese Guild', version: '2.1.0', description: 'Pristine celestial white with shimmering gold & royal navy.', accentColor: '#38bdf8', previewColor: '#0a1024', active: activeTheme === 'furina-focalors' },
        { id: 'theme-salon-solitaire', code: 'furina-salon', name: 'Salon Solitaire High Tea', category: 'themes', author: 'Mademoiselle Crabaletta', version: '1.9.0', description: 'Cozy pastel lavender & soft hydro bubble tones for salon tea.', accentColor: '#c084fc', previewColor: '#120d20', active: activeTheme === 'furina-salon' },
        { id: 'theme-abyss-midnight', code: 'furina-abyss', name: 'Submerged Abyss Midnight', category: 'themes', author: 'Fontaine Research Institute', version: '1.4.0', description: 'Ultra-dark contrast OLED theme for late-night listening.', accentColor: '#00f2fe', previewColor: '#010409', active: activeTheme === 'furina-abyss' }
      ],
      extensions: [
        { id: 'ext-visualizer', name: 'Hydro Kinetic Visualizer', version: '3.2.0', description: 'Real-time audio reactive 3D ocean mesh.', enabled: true },
        { id: 'ext-lyrics-karaoke', name: 'Synced Karaoke Lyrics Studio', version: '2.8.0', description: 'Real-time syllable highlighting and Romanized furigana.', enabled: true },
        { id: 'ext-ad-shield', name: 'Fontaine Pure Ad Shield', version: '4.0.0', description: 'Instant auto-skipping and silence protection against all commercials.', enabled: true }
      ],
      apps: [
        { id: 'app-lyrics-studio', name: 'Lyrics Cinema Stage', icon: 'mic', description: 'Immersive full-screen lyrics theater.' },
        { id: 'app-equalizer-fx', name: '10-Band Equalizer FX', icon: 'sliders', description: 'Lossless frequency mastering.' },
        { id: 'app-spotify-hub', name: 'Spotify Hub & Sync', icon: 'disc', description: 'Two-way playlist and library sync.' }
      ]
    };
  }

  setCategory(cat) {
    this.currentCategory = cat;
    document.querySelectorAll('.mp-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mp-tab-btn[data-cat="${cat}"]`)?.classList.add('active');
    this.render();
  }

  render() {
    const container = document.getElementById('marketplace-grid');
    if (!container || !this.feed) return;

    const themes = this.feed.themes || [];
    const extensions = this.feed.extensions || [];
    const apps = this.feed.apps || [];

    if (this.currentCategory === 'themes') {
      container.innerHTML = themes.map(t => `
        <div class="card-item" style="border-top: 3px solid ${t.accentColor};">
          <div style="height: 90px; border-radius: 8px; background: ${t.previewColor}; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 20px rgba(0,0,0,0.5);">
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${t.accentColor}; box-shadow: 0 0 16px ${t.accentColor};"></div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div class="card-title">${t.name}</div>
            <span style="font-size: 0.68rem; color: var(--text-dim);">v${t.version}</span>
          </div>
          <div class="card-subtitle" style="margin-bottom: 14px; height: 36px; overflow: hidden;">${t.description}</div>
          <div style="display: flex; gap: 8px; margin-top: auto;">
            <button class="btn-primary" style="flex: 1; padding: 6px 12px; font-size: 0.78rem;" onclick="window.marketplace.applyTheme('${t.code}')">
              ${t.active ? '✓ Active Theme' : 'Apply Theme'}
            </button>
          </div>
        </div>
      `).join('');
    } else if (this.currentCategory === 'extensions') {
      container.innerHTML = extensions.map(e => `
        <div class="card-item">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div class="card-title">${e.name}</div>
            <span style="font-size: 0.68rem; color: var(--text-dim);">v${e.version}</span>
          </div>
          <div class="card-subtitle" style="margin-bottom: 14px; height: 36px; overflow: hidden;">${e.description}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
            <span style="font-size: 0.72rem; color: var(--text-dim);">By ${e.author}</span>
            <button class="btn-subtle" onclick="window.marketplace.toggleExtension('${e.id}')">
              ${e.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      `).join('');
    } else if (this.currentCategory === 'apps') {
      container.innerHTML = apps.map(a => `
        <div class="card-item">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
            <div class="card-title">${a.name}</div>
            <span style="font-size: 0.68rem; color: var(--text-dim);">v${a.version}</span>
          </div>
          <div class="card-subtitle" style="margin-bottom: 14px; height: 36px; overflow: hidden;">${a.description}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
            <span style="font-size: 0.72rem; color: var(--text-dim);">By ${a.author}</span>
            <button class="btn-primary" style="padding: 6px 14px; font-size: 0.78rem;" onclick="window.marketplace.openApp('${a.id}')">
              Launch App
            </button>
          </div>
        </div>
      `).join('');
    } else if (this.currentCategory === 'updates') {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; background: var(--bg-surface); padding: 24px; border-radius: var(--radius-md); border: 1px solid var(--border-glass);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 700;">Furina Ecosystem Updates</h3>
              <p style="font-size: 0.82rem; color: var(--text-dim);">All core packages, Fontaine themes and official Spotify SDK integrations.</p>
            </div>
            <button class="btn-primary" onclick="window.marketplace.updateAll()">Update All Packages</button>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.04); border-radius: 8px;">
              <span>Furina Music Core (v1.0.0 → v1.1.0)</span>
              <span style="color: #4ade80; font-weight: 600;">Up to date</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 10px 14px; background: rgba(255,255,255,0.04); border-radius: 8px;">
              <span>Hydro Glass Theme (v1.0.8 → v1.1.0)</span>
              <span style="color: var(--accent-cyan); font-weight: 600;">Update Available</span>
            </div>
          </div>
        </div>
      `;
    }
  }

  async applyTheme(code) {
    document.documentElement.setAttribute('data-theme', code);
    localStorage.setItem('furina_theme', code);
    await fetch('/api/marketplace/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeCode: code })
    });
    if (window.showToast) window.showToast(`Theme applied: ${code}`, 'success');
    this.loadFeed();
  }

  async toggleExtension(id) {
    const res = await fetch('/api/marketplace/toggle-extension', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (window.showToast) window.showToast(`Extension ${id} is now ${data.enabled ? 'Enabled' : 'Disabled'}`);
    this.loadFeed();
  }

  openApp(appId) {
    if (appId === 'app-lyrics-studio') {
      document.getElementById('btn-toggle-stage')?.click();
    } else if (appId === 'app-equalizer-fx') {
      window.switchTab('equalizer');
    } else if (appId === 'app-listening-stats') {
      window.switchTab('stats');
    } else if (appId === 'app-spotify-hub') {
      window.switchTab('spotify-hub');
    } else if (appId === 'app-bug-logger') {
      window.furinaBugLogger?.open();
    } else if (appId === 'app-download-hub') {
      window.openModal?.('modal-download-app');
    }
  }

  async updateAll() {
    await fetch('/api/marketplace/update-all', { method: 'POST' });
    if (window.showToast) window.showToast('All Furina packages successfully updated!', 'success');
    this.loadFeed();
  }
}

window.marketplace = new FurinaMarketplace();
