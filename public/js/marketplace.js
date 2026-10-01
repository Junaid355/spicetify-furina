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
      this.feed = await res.json();
      this.render();
    } catch (err) {
      console.error('Marketplace feed load failed:', err);
    }
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

    if (this.currentCategory === 'themes') {
      container.innerHTML = this.feed.themes.map(t => `
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
      container.innerHTML = this.feed.extensions.map(e => `
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
      container.innerHTML = this.feed.apps.map(a => `
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
