class MarketplaceService {
  constructor() {
    this.installedPackages = new Set([
      'theme-furina-ocean',
      'ext-dynamic-ambient-lighting',
      'ext-pro-hotkeys',
      'app-lyrics-studio',
      'app-equalizer-fx',
      'app-listening-stats',
      'app-spotify-hub'
    ]);

    this.activeTheme = 'furina-fontaine';
    this.activeExtensions = new Set(['ext-dynamic-ambient-lighting', 'ext-pro-hotkeys']);

    // Catalog of all packages
    this.catalog = {
      themes: [
        {
          id: 'theme-furina-ocean',
          code: 'furina-fontaine',
          name: 'Furina Ocean (Fontaine Royal)',
          category: 'themes',
          author: 'Furina Archon Team',
          version: '1.2.0',
          description: 'Official midnight navy with radiant cyan hydro glows and golden accents.',
          previewColor: '#060d1b',
          accentColor: '#38bdf8',
          installed: true,
          active: true,
          hasUpdate: false
        },
        {
          id: 'theme-midnight-fontaine',
          code: 'epiclese-twilight',
          name: 'Midnight Fontaine (Opera Epiclese)',
          category: 'themes',
          author: 'Fontaine Opera Stage',
          version: '1.1.4',
          description: 'Deep royal indigo with soft amethyst violet lighting inspired by evening opera trials.',
          previewColor: '#0a0818',
          accentColor: '#c084fc',
          installed: true,
          active: false,
          hasUpdate: false
        },
        {
          id: 'theme-hydro-glass',
          code: 'hydro-pure',
          name: 'Hydro Glass (Azure Crystal)',
          category: 'themes',
          author: 'Salon Solitaire Studio',
          version: '1.0.8',
          description: 'High-transparency frosted glass with pure cyan water droplet refraction.',
          previewColor: '#031424',
          accentColor: '#22d3ee',
          installed: true,
          active: false,
          hasUpdate: true
        },
        {
          id: 'theme-deep-sea',
          code: 'deep-sea',
          name: 'Deep Sea (Primordial Abyss)',
          category: 'themes',
          author: 'Neuvillette Archive',
          version: '1.0.0',
          description: 'Abyssal teal tones reflecting the serene mystery of the Primordial Sea.',
          previewColor: '#02181b',
          accentColor: '#14b8a6',
          installed: false,
          active: false,
          hasUpdate: false
        },
        {
          id: 'theme-moonlit-ocean',
          code: 'moonlit-ocean',
          name: 'Moonlit Ocean (Silver Tide)',
          category: 'themes',
          author: 'Lumine Fontaine',
          version: '1.0.2',
          description: 'Cool slate-blue with soft pearl-silver typography and reflective wave borders.',
          previewColor: '#0f172a',
          accentColor: '#94a3b8',
          installed: false,
          active: false,
          hasUpdate: false
        },
        {
          id: 'theme-fontaine-night',
          code: 'fontaine-night',
          name: 'Fontaine Night (Golden Iris)',
          category: 'themes',
          author: 'Court of Fontaine',
          version: '1.0.0',
          description: 'Warm gold and dark mahogany undertones for rich orchestral evenings.',
          previewColor: '#140c06',
          accentColor: '#f59e0b',
          installed: false,
          active: false,
          hasUpdate: false
        },
        {
          id: 'theme-aurora-water',
          code: 'aurora-water',
          name: 'Aurora Water (Prismatic Waves)',
          category: 'themes',
          author: 'Hydro Visions',
          version: '1.1.0',
          description: 'Iridescent animated color shifts responding dynamically to music rhythm.',
          previewColor: '#081226',
          accentColor: '#818cf8',
          installed: false,
          active: false,
          hasUpdate: false
        },
        {
          id: 'theme-minimal-furina',
          code: 'minimal-furina',
          name: 'Minimal Furina (Clean Studio)',
          category: 'themes',
          author: 'Minimalist Guild',
          version: '1.0.5',
          description: 'Distraction-free high-contrast monochrome with subtle cyan status dots.',
          previewColor: '#000000',
          accentColor: '#38bdf8',
          installed: false,
          active: false,
          hasUpdate: false
        }
      ],
      extensions: [
        {
          id: 'ext-dynamic-ambient-lighting',
          name: 'Dynamic Ambient Album Art Glow',
          category: 'extensions',
          author: 'Furina UI Lab',
          version: '1.3.0',
          description: 'Real-time dominant color extraction from active album art projecting ambient light meshes.',
          installed: true,
          enabled: true,
          hasUpdate: false
        },
        {
          id: 'ext-pro-hotkeys',
          name: 'VIM & Pro Navigation Hotkeys',
          category: 'extensions',
          author: 'Fontaine Hackers',
          version: '1.0.4',
          description: 'Desktop shortcuts (Space, N, P, M, F, Q, Arrows) plus J/K list navigation.',
          installed: true,
          enabled: true,
          hasUpdate: false
        },
        {
          id: 'ext-mini-player-widget',
          name: 'Picture-in-Picture Mini Player',
          category: 'extensions',
          author: 'Mademoiselle Crabaletta',
          version: '1.0.1',
          description: 'Floating always-on-top mini player with album art and synchronized playback scrub.',
          installed: false,
          enabled: false,
          hasUpdate: false
        },
        {
          id: 'ext-auto-sync-daemon',
          name: 'Auto-Sync Background Daemon',
          category: 'extensions',
          author: 'Surintendante Chevalmarin',
          version: '1.0.0',
          description: 'Periodic background check and timestamp synchronization for imported Spotify playlists.',
          installed: false,
          enabled: false,
          hasUpdate: false
        }
      ],
      apps: [
        {
          id: 'app-lyrics-studio',
          name: 'Lyrics Studio & Karaoke',
          category: 'apps',
          author: 'Furina Opera Team',
          version: '2.0.0',
          description: 'Full-screen theater synchronized lyric visualizer with millisecond click-to-seek and auto-scroll.',
          installed: true,
          enabled: true,
          hasUpdate: false
        },
        {
          id: 'app-equalizer-fx',
          name: '10-Band Graphic Equalizer & FX',
          category: 'apps',
          author: 'Fontaine Audio Engineering',
          version: '1.2.0',
          description: 'Web Audio API parametric 10-band equalizer presets (Bass Boost, Opera Vocal, Classical, Acoustic).',
          installed: true,
          enabled: true,
          hasUpdate: false
        },
        {
          id: 'app-listening-stats',
          name: 'Listening Statistics & Insights',
          category: 'apps',
          author: 'Oratrice Mecanique dAnalyse Cardinale',
          version: '1.1.0',
          description: 'Personalized listening analytics, top artists, favorite tracks, and Fontaine music affinity.',
          installed: true,
          enabled: true,
          hasUpdate: false
        },
        {
          id: 'app-spotify-hub',
          name: 'Spotify Diagnostics & Sync Hub',
          category: 'apps',
          author: 'Official Spotify Integration Group',
          version: '1.4.0',
          description: 'Real-time OAuth telemetry, playlist importer, track matching inspector, and latency graphs.',
          installed: true,
          enabled: true,
          hasUpdate: false
        }
      ]
    };
  }

  getMarketplaceFeed() {
    const all = [
      ...this.catalog.themes,
      ...this.catalog.extensions,
      ...this.catalog.apps
    ];

    const updates = all.filter(item => item.hasUpdate);
    const installed = all.filter(item => this.installedPackages.has(item.id));

    return {
      themes: this.catalog.themes.map(t => ({
        ...t,
        installed: this.installedPackages.has(t.id),
        active: this.activeTheme === t.code
      })),
      extensions: this.catalog.extensions.map(e => ({
        ...e,
        installed: this.installedPackages.has(e.id),
        enabled: this.activeExtensions.has(e.id)
      })),
      apps: this.catalog.apps.map(a => ({
        ...a,
        installed: this.installedPackages.has(a.id)
      })),
      installedCount: installed.length,
      updatesAvailable: updates.length,
      activeTheme: this.activeTheme
    };
  }

  installPackage(id) {
    this.installedPackages.add(id);
    return { success: true, id };
  }

  uninstallPackage(id) {
    this.installedPackages.delete(id);
    this.activeExtensions.delete(id);
    return { success: true, id };
  }

  setTheme(themeCode) {
    this.activeTheme = themeCode;
    return { success: true, activeTheme: themeCode };
  }

  toggleExtension(id) {
    if (this.activeExtensions.has(id)) {
      this.activeExtensions.delete(id);
      return { enabled: false, id };
    } else {
      this.activeExtensions.add(id);
      return { enabled: true, id };
    }
  }

  updateAll() {
    return { success: true, updatedCount: 1, message: 'All Furina packages up to date.' };
  }
}

module.exports = new MarketplaceService();
