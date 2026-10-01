# 🌊 Furina Music (Spicetify v7.5.0 Edition)

[![Release](https://img.shields.io/github/v/release/Junaid355/spicetify-furina?style=for-the-badge&color=38bdf8)](https://github.com/Junaid355/spicetify-furina/releases/tag/v7.5.0)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20Android%20%7C%20Web-38bdf8?style=for-the-badge)](https://junaid355.github.io/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Live Web](https://img.shields.io/badge/Live%20App-junaid355.github.io-00e5ff?style=for-the-badge&logo=github)](https://junaid355.github.io/)

A lossless music streaming platform and Spicetify-inspired client tailored with Fontaine aesthetics, real Spotify playlist importing, official OAuth 2.0 integration, 3D WebGL2 visuals, Aceternity & Magic UI motion primitives, cozy Web Audio haptics, and complete desktop/mobile binaries.

---

## 📥 Direct Downloads & Releases (v7.5.0)

| Platform | Download Link | File Type | Size | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Windows Installer** | [Furina-Music-Setup-1.0.0.exe](https://github.com/Junaid355/spicetify-furina/releases/download/v7.5.0/Furina-Music-Setup-1.0.0.exe) | NSIS Installer | 101 MB | Auto-updates enabled via GitHub Releases |
| **Windows Portable** | [Furina-Music-1.0.0-portable.exe](https://github.com/Junaid355/spicetify-furina/releases/download/v7.5.0/Furina-Music-1.0.0-portable.exe) | Standalone Executable | 100 MB | Zero installation required; run anywhere |
| **Android Phone / Tablet** | [Furina-Music.apk](https://github.com/Junaid355/spicetify-furina/releases/download/v7.5.0/Furina-Music.apk) | Android Package | 3.5 MB | Offline caching, background playback |
| **Web / PWA (iPhone / Mac)** | [https://junaid355.github.io/](https://junaid355.github.io/) | Progressive Web App | Instant | Add to Home Screen via Safari / Chrome |
| **Release Manifest** | [latest.yml](https://github.com/Junaid355/spicetify-furina/releases/download/v7.5.0/latest.yml) | Update Manifest | 400 B | Electron Auto-Updater feed |

---

## ✨ Features & Architecture

### 1. 3D Motion System & Aceternity UI Primitives
- **Spotlight Search & 3D Bento Grid**: Real-time spotlight beam tracking the cursor, one-click trending quick pills (*Lust, A Thousand Years, Tum Jo Aaye, La Vaguelette*), and a 6-genre 3D interactive bento grid.
- **3D WebGL2 Three.js Hydro Aura**: 5 rotating floating hydro crystal gems with depth perspective reacting to viewport scroll and ambient room colors.
- **3D Vinyl Turntable Stage Overlay**: Full-screen Epiclese Theater stage with a rotating vinyl record deck, precision tonearm, synced LRC lyrics display, and Web Audio API oscilloscope waveform.
- **Card 3D Gyroscopic Tilt**: Interactive 3D perspective tilt on hover and mobile touch across all playlist cards and album art frames.

### 2. Cozy Web Audio Haptic & Sound Effects
- **Synthesized Hydro Chimes & Tactile Clicks**: Zero-latency native Web Audio API oscillators synthesize delicate crystalline droplet chimes and tactile switch clicks on button and card interactions (`audio-effects.js`).
- **Zero Extra Bloat**: 100% procedurally synthesized in the browser without loading heavy external sound files.

### 3. Fontaine Diagnostics & Bug Logger Drawer
- **Real-Time Event Capture**: Intercepts console logs, audio state transitions, stream resolution latency, and network fetch errors into an Aceternity glassmorphic slide-out drawer (`bug-logger.js`).
- **One-Click Diagnostics**: Run automated self-tests, copy comprehensive debug reports to clipboard, or export full JSON traces for instant bug remediation.

### 4. 100% Full-Length Songs & Zero-Ad Shield
- **Guaranteed Full Song Playback**: Zero 30-second preview cutoffs. High-bitrate audio streams mapped for all catalog songs and imported tracks.
- **Ad-Free Stream Shield**: Automatic detection and silent suppression of audio sponsor interruptions with zero user friction.

### 5. Dual-Engine Spotify Integration
- **Public Playlist Scraping & Deduplication**: Paste any Spotify playlist URL (e.g. `6bFFesLukTP2leRfDj1hTO` Hindi Lo-Fi / Tum Jo Aaye, Today's Top Hits) to import all real song titles, artists, and artwork with deduplication.
- **Official Spotify OAuth 2.0**: Connect with Spotify via authorization code flow or direct Access Token to sync Liked Songs (`/me/tracks`) and user playlists.

### 6. Audiophile DSP Engine
- **10-Band Graphic Equalizer**: Web Audio API filters from 32Hz to 16kHz with custom gain sliders and presets (Bass Boost, Vocal Clarity, Electronic, Classical Epiclese).
- **Spatial Convolution Reverb**: Simulated acoustic spaces for Fontaine Opera Hall and intimate studio monitoring.

---

## 🚀 Quick Start (Development & Local Build)

### 1. Requirements
- Node.js 18 or higher
- npm 9 or higher

### 2. Installation
```bash
git clone https://github.com/Junaid355/spicetify-furina.git
cd spicetify-furina
npm install
```

### 3. Start Development Server
```bash
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build Windows Desktop App
```bash
npm run build:electron
# Output generated in dist/:
# - Furina-Music-Setup-1.0.0.exe
# - Furina-Music-1.0.0-portable.exe
```

---

## 📁 Repository Structure

```
spicetify-furina/
├── desktop/                  # Electron main process & auto-updater
├── mobile/                   # Android Capacitor wrapper & assets
├── public/                   # Frontend SPA client & static web app
│   ├── css/                  # Spicetify layout, animations & Aceternity components
│   ├── data/                 # Indexed track catalogs (catalog.json & video-map.json)
│   ├── icons/ & images/      # Furina animated artwork, badges & mascots
│   ├── js/                   # Audio player, audio effects, bug logger, & 3D Three.js scene
│   ├── index.html            # Main SPA entrypoint
│   ├── manifest.json         # PWA Web Manifest
│   └── sw.js                 # Service worker
├── scripts/                  # Release publishing & catalog indexing scripts
├── server/                   # Express backend & SQLite database
└── sync_to_github_all.js     # Dual-repository deployment pipeline
```

---

## 📜 License
MIT License. Tailored for Fontaine music enthusiasts and the Spicetify modding community.
