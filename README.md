# 🌊 Furina Music (Spicetify Edition)

A music platform and Spicetify-inspired client tailored with Fontaine aesthetics, real Spotify playlist importing, official OAuth 2.0 integration, and a Web Audio DSP equalizer.

---

## ✨ Features

- **Spicetify Desktop Aesthetics**:
  - Authentic 5-column Spotify table view (`#`, `Title / Artist`, `Album`, `Date Added`, `⏱`).
  - Adaptive responsive sidebar that gracefully collapses into an icon rail on compact viewports.
  - Dynamic hero banner gradient that samples dominant colors directly from album artwork.
  - Floating 56px circular play button, quick search filter, and animated dancing equalizer audio indicators.

- **Dual-Engine Spotify Integration**:
  - **Public Playlist Scraping**: Paste any public Spotify playlist URL (e.g. `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M`) to import all real song titles, artists, album art, and 30-second audio previews immediately—no developer credentials required!
  - **Official Spotify OAuth 2.0**: Connect with Spotify via authorization code flow or paste custom `Client ID` / `Client Secret` / direct Access Token via the interactive **Connect to Spotify** modal.
  - Live latency testing and account status badge.

- **Spicetify-Inspired Marketplace & Modding**:
  - **8 Fontaine Themes**: Furina Ocean, Midnight Fontaine, Hydro Glass, Deep Sea, Moonlit Ocean, Fontaine Night, Aurora Water, and Minimal Furina.
  - **Extensions**: Pro Navigation Hotkeys, Dynamic Ambient Lighting, Mini Floating Player, and Auto-Sync Daemon.
  - **Custom Apps**: In-app Marketplace, Synchronized Lyrics Studio, Listening Analytics, and 10-Band Graphic Equalizer.

- **Audiophile DSP Engine**:
  - Web Audio API 10-band equalizer (32Hz to 16kHz) with gain sliders and presets (Bass Boost, Vocal, Electronic, Classical).
  - Spatial Reverb & Convolution simulation.
  - Lossless WAV audio fallback and synchronized millisecond-precision LRC lyrics.

- **Multi-Platform Ready**:
  - Progressive Web App (PWA) with Service Worker and offline caching.
  - Desktop integration via Electron (`desktop/electron-main.js`).
  - Mobile foundation via Capacitor (`mobile/capacitor.config.json`).

---

## 🚀 Quick Start

### 1. Requirements
- Node.js 18 or higher
- npm 9 or higher

### 2. Installation
```bash
git clone https://github.com/Junaid355/spicetify-furina.git
cd spicetify-furina
npm install
```

### 3. Start the Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Spotify Integration Setup

Furina Music works right out of the box for public Spotify playlists. To enable full account synchronization:

1. Click the **Spotify Status Badge** in the top navigation header or open Settings -> **Connect to Spotify**.
2. **Option A (Instant Direct Token)**: Paste a temporary OAuth token from the [Spotify Web Console](https://developer.spotify.com/console/get-current-user/).
3. **Option B (Custom App Credentials)**:
   - Create an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).
   - Set Redirect URI to `http://localhost:3000/api/auth/spotify/callback`.
   - Save your `Client ID` and `Client Secret` in the Connect Modal or in a `.env` file:
     ```env
     SPOTIFY_CLIENT_ID=your_client_id_here
     SPOTIFY_CLIENT_SECRET=your_client_secret_here
     SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/spotify/callback
     ```
   - Click **Connect with Spotify** to authenticate.

---

## 📁 Repository Structure

```
spicetify-furina/
├── desktop/                  # Electron main process & preload scripts
├── mobile/                   # Capacitor mobile config
├── public/                   # Frontend SPA shell & assets
│   ├── audio/                # Bundled lossless audio demo tracks
│   ├── css/                  # Spicetify layout, animations & themes
│   ├── icons/ & images/      # Fontaine Furina artwork & UI badges
│   ├── js/                   # Audio player, DSP equalizer, lyrics, and Spotify client
│   ├── index.html            # Main SPA entrypoint
│   ├── manifest.json         # PWA Web Manifest
│   └── sw.js                 # Service worker
├── server/                   # Express backend & SQLite database
│   ├── db/                   # SQLite schema & database migrations
│   ├── providers/            # Spotify API provider & public scraper
│   ├── routes/               # REST API endpoints
│   ├── services/             # Sync, marketplace, & recommendation engines
│   └── index.js              # Server entry point
├── tests/                    # Integration and unit tests
└── package.json              # Project dependencies & scripts
```

---

## 📜 License
MIT License. Built for Fontaine music enthusiasts and Spicetify community modders.
