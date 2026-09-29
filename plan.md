# Furina Music — Complete Rebuild Master Plan

## 1. System Audit & Root-Cause Diagnosis
- **Spotify OAuth**: The previous iteration lacked a direct redirect to official Spotify accounts login (`https://accounts.spotify.com/authorize`). Users could not log into Spotify directly.
- **Spotify API & Playlists**: Without proper authorization code exchange and token refresh, requests to `/v1/me/playlists` failed or relied on manual token input.
- **UI & Motion**: The interface was overly static, lacked fluid page transitions, dynamic color adaptation from album art, interactive canvas particles, and card micro-interactions.
- **Spicetify Ecosystem**: Missing modular marketplace, themes, extensions, custom apps, and update mechanics.

---

## 2. Rebuilt Architecture
```
furina-music/
├── server/
│   ├── index.js                  # Express API server with Spotify OAuth & static hosting
│   ├── db/
│   │   ├── schema.sql            # SQLite schema (users, provider_accounts, marketplace, playlists, tracks)
│   │   └── database.js           # Database manager with migrations & seeding
│   ├── providers/
│   │   ├── MusicProvider.js      # Unified provider interface
│   │   ├── FurinaCatalogProvider.js # Local & server authorized lossless WAV provider
│   │   └── SpotifyProvider.js    # Official Spotify API client (OAuth code exchange, refresh, playlists, search)
│   ├── services/
│   │   ├── syncService.js        # Playlist import & fuzzy catalog matching engine
│   │   ├── marketplaceService.js # Marketplace packages (Themes, Extensions, Custom Apps)
│   │   └── lyricsService.js      # Synced lyrics provider
│   └── routes/
│       ├── authRoutes.js         # Official Spotify OAuth redirect (/login, /callback, /disconnect)
│       ├── spotifyRoutes.js      # Diagnostics, user playlists, playlist URL import
│       ├── catalogRoutes.js      # Tracks, albums, artists, lyrics, audio quality
│       ├── playlistRoutes.js     # CRUD, reorder, import, sync
│       ├── marketplaceRoutes.js  # Marketplace items, install, enable, updates
│       └── libraryRoutes.js      # Likes, history, downloads, settings
├── public/
│   ├── index.html                # Rebuilt SPA shell with dynamic reactive background & marketplace
│   ├── manifest.json             # PWA Manifest
│   ├── sw.js                     # Service Worker
│   ├── css/
│   │   ├── design-tokens.css     # 8 Fontaine themes with CSS custom properties
│   │   ├── layout.css            # Responsive grid & mobile bottom-sheet
│   │   ├── animations.css        # Fluid GPU animations, staggers, vinyl rotation, ripple canvas
│   │   ├── components.css        # 3D cards, badges, modal dialogs, marketplace UI
│   │   └── player.css            # Scrubber, stage player, visualizer, audio inspector
│   └── js/
│       ├── audio-player.js       # Web Audio API engine + 10-band Equalizer DSP
│       ├── dynamic-bg.js         # Album-art reactive color mesh & ocean ripples canvas
│       ├── spotify-auth.js       # OAuth PKCE & official login redirect coordinator
│       ├── marketplace.js        # Theme switching, extensions runner, custom apps registry
│       ├── lyrics-engine.js      # Millisecond-precision LRC synchronized parser
│       ├── offline-storage.js    # IndexedDB vault for authorized downloads
│       └── app.js                # Core controller, router, keyboard hotkeys
```

---

## 3. Spotify Official OAuth Flow
1. User clicks **"Log in with Spotify"**.
2. App directs to `GET /api/auth/spotify/login`.
3. Server generates cryptographically secure `state`, stores it, and redirects to:
   `https://accounts.spotify.com/authorize?response_type=code&client_id=...&scope=...&redirect_uri=...&state=...`
4. User logs in directly on Spotify's official login screen and authorizes scopes:
   `user-read-private user-read-email playlist-read-private playlist-read-collaborative streaming user-read-playback-state user-modify-playback-state`
5. Spotify redirects to `/api/auth/spotify/callback?code=...&state=...`.
6. Server exchanges code with `https://accounts.spotify.com/api/token`, retrieves `access_token` and `refresh_token`, saves to SQLite `provider_accounts`, and redirects to `/?spotify=connected`.
7. Client automatically detects connection, updates UI, and loads user's real Spotify playlists.
8. Spotify Diagnostics dashboard reports live token status, scopes, rate-limit health, and API connectivity.

---

## 4. Spicetify-Inspired Marketplace & Customization
- **Themes (8 total)**:
  - Furina Ocean, Midnight Fontaine, Hydro Glass, Deep Sea, Moonlit Ocean, Fontaine Night, Aurora Water, Minimal Furina.
- **Extensions (4 total)**:
  - VIM & Pro Navigation Hotkeys
  - Dynamic Ambient Canvas Lighting
  - Mini Player Floating Widget
  - Auto-Sync Background Daemon
- **Custom Apps (5 total)**:
  - Marketplace Storefront
  - Lyrics Studio
  - Listening Analytics & Statistics
  - 10-Band Graphic Equalizer & Spatial Reverb
  - Spotify Hub & Diagnostics
- **Updates Engine**:
  - Live version checker for core app and installed extensions.

---

## 5. Visual Polish & Animation System
- **Dynamic Background Mesh**: Canvas reads active artwork, extracts dominant hue, and renders moving ambient radial waves.
- **Micro-interactions**: Hover lifts on cards (`translateY(-6px) scale(1.02)`), glowing hydro borders, ripple particles on click.
- **Full-Screen Stage Player**: Vinyl disc rotation, live frequency bars, karaoke lyric illumination with auto-scroll.
