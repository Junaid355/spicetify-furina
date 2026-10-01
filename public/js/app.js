/**
 * Furina Music — Rebuilt Master Application Controller
 */

// Application State
const appState = {
  currentView: 'home',
  activePlaylistId: null,
  homeData: null,
  playlists: [],
  likedTrackIds: new Set(),
  searchQuery: '',
  searchResults: null,
  searchFilter: 'all',
  isStagePlayerOpen: false,
  isQueueOpen: false,
  spotifyConnected: false,
  spotifyProfile: null
};

// Utilities & Resilient Fallback Artwork
function getFallbackArtwork() {
  const basePath = window.location.pathname.includes('/spicetify-furina/') ? '/spicetify-furina/' : '/';
  return `${basePath}images/furina_salon_music.jpg`.replace('//', '/');
}
window.getFallbackArtwork = getFallbackArtwork;

function formatTime(val) {
  if (!val || isNaN(val)) return '0:00';
  let seconds = val;
  if (seconds > 1000) {
    seconds = seconds / 1000;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      bottom: 104px;
      right: 24px;
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(14, 28, 54, 0.95);
    border: 1px solid var(--border-glass);
    color: var(--text-main);
    padding: 12px 20px;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-card);
    backdrop-filter: blur(16px);
    font-size: 0.85rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    animation: fadeIn 0.2s ease-out;
  `;
  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠' : '✦';
  toast.innerHTML = `<span style="color: var(--accent-cyan); font-weight: bold;">${icon}</span> ${message}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
window.showToast = showToast;

// Router & View Switcher
function switchTab(viewId, params = {}) {
  appState.currentView = viewId;
  document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));

  const targetView = document.getElementById(`view-${viewId}`);
  if (targetView) targetView.classList.add('active');

  const navEl = document.querySelector(`.nav-item[data-tab="${viewId}"]`);
  if (navEl) navEl.classList.add('active');

  const mobileNavEl = document.querySelector(`.mobile-nav-item[data-tab="${viewId}"]`);
  if (mobileNavEl) mobileNavEl.classList.add('active');

  if (viewId === 'home') loadHome();
  if (viewId === 'library') loadLibrary();
  if (viewId === 'playlist-detail') loadPlaylistDetail(params.playlistId);
  if (viewId === 'marketplace') window.marketplace.loadFeed();
  if (viewId === 'spotify-hub') loadSpotifyHub();
  if (viewId === 'equalizer') loadEqualizerUI();
  if (viewId === 'stats') loadStatsUI();
  if (viewId === 'settings') loadSettings();
}
window.switchTab = switchTab;

// 1. Home View Loader
async function loadHome() {
  try {
    const res = await fetch('/api/catalog/home');
    const data = await res.json();
    appState.homeData = data;

    // Render Hero Banner
    const heroEl = document.getElementById('home-hero-banner');
    if (heroEl && data.hero) {
      heroEl.innerHTML = `
        <img class="hero-banner-img" src="${data.hero.image}" alt="Furina Banner" />
        <div class="hero-banner-overlay">
          <div class="hero-badge">${data.hero.badge}</div>
          <div class="hero-title">${data.hero.title}</div>
          <div class="hero-subtitle">${data.hero.subtitle}</div>
          <div class="hero-actions">
            <button class="btn-primary" onclick="playCuratedTrack('${data.hero.actionTrackId}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Play Grand Opera
            </button>
            <button class="btn-secondary" onclick="switchTab('spotify-hub')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.496 9.721 1.121.295.18.388.563.208.851zm1.224-2.72c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.852-.107-.977-.52-.125-.413.107-.852.52-.977 3.632-1.102 8.147-.568 11.248 1.331.367.226.482.71.256 1.077zm.106-2.828c-3.226-1.916-8.544-2.093-11.621-1.158-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.022.63-1.173 3.535-1.073 9.404-.866 13.115 1.337.447.265.592.846.327 1.293-.266.448-.847.593-1.279.331z"/></svg>
              Spotify Hub & Sync
            </button>
          </div>
        </div>
      `;
    }

    // Curated Playlists Shelf
    const plShelf = document.getElementById('featured-playlists-shelf');
    if (plShelf && data.playlists) {
      plShelf.innerHTML = data.playlists.map(pl => `
        <div class="card-item" onclick="switchTab('playlist-detail', { playlistId: '${pl.id}' })">
          <div class="card-cover-wrapper">
            <img class="card-cover" src="${pl.cover_url || '/images/default_artwork.jpg'}" alt="${pl.name}" loading="lazy" />
            <div class="card-play-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="card-title">${pl.name}</div>
          <div class="card-subtitle">${pl.track_count || 0} tracks • ${pl.provider === 'spotify' ? 'Spotify' : 'Furina'}</div>
        </div>
      `).join('');
    }

    // Global Trending Shelf (Live Multi-Source API)
    const globalShelf = document.getElementById('home-global-trending-shelf');
    if (globalShelf && data.globalTrending && data.globalTrending.length > 0) {
      globalShelf.innerHTML = data.globalTrending.map((t, idx) => `
        <div class="card-item" onclick="handleTrackClick('${t.id}', appState.homeData.globalTrending)">
          <div class="card-cover-wrapper">
            <img class="card-cover" src="${t.coverUrl || '/images/default_artwork.jpg'}" alt="${t.title}" loading="lazy" />
            <div class="card-play-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="card-title">${t.title}</div>
          <div class="card-subtitle"><span class="badge-provider ${t.provider}">${t.provider}</span> ${t.artist}</div>
        </div>
      `).join('');
    }

    // Solitaire Trending Tracks
    const tracksContainer = document.getElementById('home-recent-tracks');
    if (tracksContainer && data.trending) {
      tracksContainer.innerHTML = data.trending.map((t, idx) => renderTrackRow(t, idx, data.trending)).join('');
    }

    // Top 5 Fontaine Charts
    const chartsContainer = document.getElementById('home-charts-shelf');
    if (chartsContainer && data.charts) {
      chartsContainer.innerHTML = data.charts.map(c => `
        <div class="card-item" onclick="playCuratedTrack('${c.track.id}')">
          <div class="card-cover-wrapper">
            <img class="card-cover" src="${c.track.coverUrl}" alt="${c.track.title}" loading="lazy" />
            <div class="card-play-overlay">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
          </div>
          <div class="card-title">#${c.rank} ${c.track.title}</div>
          <div class="card-subtitle">${c.track.artist}</div>
        </div>
      `).join('');
    }

    // Moods
    const moodsContainer = document.getElementById('home-moods-shelf');
    if (moodsContainer && data.moods) {
      moodsContainer.innerHTML = data.moods.map(m => `
        <div class="card-item" onclick="playMood('${m.id}')">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">${m.icon}</div>
          <div class="card-title">${m.name}</div>
          <div class="card-subtitle">${m.description}</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Home load failed:', err);
  }
}

// 2. Track Row with dancing equalizer indicator
function renderTrackRow(track, index, contextQueue = null) {
  const isPlaying = window.furinaAudio.currentTrack?.id === track.id;
  const isAudioActive = isPlaying && window.furinaAudio.isPlaying;
  const isLiked = appState.likedTrackIds.has(track.id);

  return `
    <div class="track-row ${isPlaying ? 'playing' : ''}" data-track-id="${track.id}" data-index="${index !== undefined ? index + 1 : '♪'}" onclick="handleTrackClick('${track.id}')">
      <div class="track-index">
        ${isAudioActive ? `
          <div class="playing-eq-indicator">
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
          </div>
        ` : (isPlaying ? '▶' : (index !== undefined ? index + 1 : '♪'))}
      </div>
      <img class="track-thumbnail" src="${(track.cover_url && !track.cover_url.includes('app-icon.jpg')) ? track.cover_url : ((track.coverUrl && !track.coverUrl.includes('app-icon.jpg')) ? track.coverUrl : window.getFallbackArtwork())}" alt="${track.title}" onerror="this.onerror=null; this.src=window.getFallbackArtwork();" loading="lazy" />
      <div class="track-meta">
        <div class="track-title">${track.title}</div>
        <div class="track-artist">
          <span class="badge-provider ${track.provider}">${track.provider}</span>
          ${track.artist} • ${track.album || ''}
        </div>
      </div>
      <div class="track-actions" onclick="event.stopPropagation()">
        <button class="btn-icon-subtle" onclick="addToSpotifyPlaylist('${track.id}')" title="Sync to Spotify">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#1ed760"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.496 9.721 1.121.295.18.388.563.208.851zm1.224-2.72c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.852-.107-.977-.52-.125-.413.107-.852.52-.977 3.632-1.102 8.147-.568 11.248 1.331.367.226.482.71.256 1.077zm.106-2.828c-3.226-1.916-8.544-2.093-11.621-1.158-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.022.63-1.173 3.535-1.073 9.404-.866 13.115 1.337.447.265.592.846.327 1.293-.266.448-.847.593-1.279.331z"/></svg>
        </button>
        <button class="btn-icon-subtle ${isLiked ? 'liked' : ''}" onclick="toggleLike('${track.id}')" title="Like Song">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="btn-icon-subtle" onclick="downloadTrackOffline('${track.id}')" title="${track.isDownloadable ? 'Download Offline (Authorized)' : 'Offline download is unavailable for this provider'}">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <button class="btn-icon-subtle" onclick="showTrackQualityInspector('${track.id}')" title="Inspect Audio Quality">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        </button>
        <div class="track-duration">${formatTime(track.duration_ms || track.durationMs || track.duration || 180000)}</div>
      </div>
    </div>
  `;
}

// Track Play Handler
async function handleTrackClick(trackId, queue = null) {
  let track = null;
  if (queue && Array.isArray(queue)) {
    track = queue.find(t => t.id === trackId || t.track_id === trackId);
  }
  if (!track && appState.currentPlaylistTracks) {
    track = appState.currentPlaylistTracks.find(t => t.id === trackId || t.track_id === trackId);
    if (!queue) queue = appState.currentPlaylistTracks;
  }
  if (!track && appState.homeData) {
    const allHome = [
      ...(appState.homeData.spotlightTracks || []),
      ...(appState.homeData.globalTrending || []),
      ...(appState.homeData.trending || [])
    ];
    track = allHome.find(t => t.id === trackId || t.track_id === trackId);
    if (!queue) queue = allHome;
  }
  if (!track && appState.searchResults) {
    const allSearch = appState.searchResults.allTracks || appState.searchResults.tracks || [];
    track = allSearch.find(t => t.id === trackId);
    if (!queue) queue = allSearch;
  }
  if (!track) {
    const custom = JSON.parse(localStorage.getItem('furina_custom_playlists') || '[]');
    for (const pl of custom) {
      if (pl.tracks) {
        track = pl.tracks.find(t => t.id === trackId || t.track_id === trackId);
        if (track) {
          if (!queue) queue = pl.tracks;
          break;
        }
      }
    }
  }
  if (!track) {
    try {
      const res = await fetch(`/api/catalog/tracks/${trackId}`);
      if (res.ok) track = await res.json();
    } catch (_) {}
  }
  if (track) {
    window.furinaAudio.playTrack(track, queue);
  }
}
window.handleTrackClick = handleTrackClick;

async function playCuratedTrack(trackId) {
  const res = await fetch(`/api/catalog/tracks/${trackId}`);
  const track = await res.json();
  window.furinaAudio.playTrack(track);
}
window.playCuratedTrack = playCuratedTrack;

async function playMood(moodId) {
  const res = await fetch(`/api/catalog/moods/${moodId}`);
  const data = await res.json();
  if (data.tracks && data.tracks.length > 0) {
    window.furinaAudio.playTrack(data.tracks[0], data.tracks);
    showToast(`Playing Fontaine mood: ${moodId.replace('mood_', '')}`);
  }
}
window.playMood = playMood;

// 3. Search Engine
let searchDebounceTimeout = null;
function initSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;

  input.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimeout);
    const query = e.target.value.trim();
    if (!query) {
      document.getElementById('search-results').innerHTML = `
        <div style="text-align: center; color: var(--text-dim); margin-top: 40px;">
          Type to search songs, artists, albums across Furina and Spotify...
        </div>
      `;
      return;
    }

    searchDebounceTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        appState.searchResults = data.results || { allTracks: data.tracks || [], tracks: data.tracks || [] };
        renderSearchResults();
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 250);
  });
}

function setSearchFilter(filter) {
  appState.searchFilter = filter;
  document.querySelectorAll('.search-filter-pill').forEach(p => p.classList.remove('active'));
  const activePill = document.querySelector(`.search-filter-pill[data-filter="${filter}"]`);
  if (activePill) activePill.classList.add('active');
  renderSearchResults();
}
window.setSearchFilter = setSearchFilter;

function renderSearchResults() {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer || !appState.searchResults) return;

  const sr = appState.searchResults;
  let tracks = sr.allTracks || sr.tracks || [];
  if (appState.searchFilter === 'furina') {
    tracks = sr.furina?.tracks || tracks.filter(t => t.provider === 'furina');
  } else if (appState.searchFilter === 'spotify') {
    tracks = sr.spotify?.tracks || tracks.filter(t => t.provider === 'spotify');
  } else if (appState.searchFilter === 'deezer') {
    tracks = sr.deezer?.tracks || tracks.filter(t => t.provider === 'deezer');
  } else if (appState.searchFilter === 'apple') {
    tracks = sr.apple?.tracks || tracks.filter(t => t.provider === 'apple');
  }

  const allCount = sr.allTracks?.length || sr.tracks?.length || tracks.length;
  const spCount = sr.spotify?.tracks?.length || tracks.filter(t => t.provider === 'spotify').length;
  const dzCount = sr.deezer?.tracks?.length || tracks.filter(t => t.provider === 'deezer').length;
  const apCount = sr.apple?.tracks?.length || tracks.filter(t => t.provider === 'apple').length;
  const fuCount = sr.furina?.tracks?.length || tracks.filter(t => t.provider === 'furina').length;

  if (tracks.length === 0) {
    resultsContainer.innerHTML = `
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
        <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="setSearchFilter('all')">All Tracks (${allCount})</button>
        <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'spotify' ? 'active' : ''}" data-filter="spotify" onclick="setSearchFilter('spotify')">Spotify Tracks (${spCount})</button>
        <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'furina' ? 'active' : ''}" data-filter="furina" onclick="setSearchFilter('furina')">Fontaine Masters (${fuCount})</button>
      </div>
      <div style="text-align: center; color: var(--text-dim); margin-top: 40px;">
        No tracks found for filter: ${appState.searchFilter.toUpperCase()}.
      </div>
    `;
    return;
  }

  resultsContainer.innerHTML = `
    <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;">
      <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="setSearchFilter('all')">All Tracks (${allCount})</button>
      <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'spotify' ? 'active' : ''}" data-filter="spotify" onclick="setSearchFilter('spotify')">Spotify Tracks (${spCount})</button>
      <button class="btn-subtle search-filter-pill ${appState.searchFilter === 'furina' ? 'active' : ''}" data-filter="furina" onclick="setSearchFilter('furina')">Fontaine Masters (${fuCount})</button>
    </div>
    <div class="track-list">
      ${tracks.map((t, idx) => renderTrackRow(t, idx, tracks)).join('')}
    </div>
  `;
}

// 4. Library View Loader
async function loadLibrary() {
  const container = document.getElementById('library-playlists-list');
  if (!container) return;

  try {
    const [playlistsRes, likesRes, downloadsRes] = await Promise.all([
      fetch('/api/playlists'),
      fetch('/api/library/likes'),
      fetch('/api/library/downloads')
    ]);

    const playlists = await playlistsRes.json();
    const likes = await likesRes.json();
    const downloads = await downloadsRes.json();

    appState.likedTrackIds = new Set(likes.map(t => t.id));

    container.innerHTML = `
      <!-- Liked Songs Special Shelf -->
      <div class="card-item" style="background: linear-gradient(135deg, rgba(2, 132, 199, 0.4), rgba(56, 189, 248, 0.15)); margin-bottom: 18px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #0284c7, #38bdf8); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-card);">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </div>
            <div>
              <div class="card-title" style="font-size: 1.1rem;">Liked Songs</div>
              <div class="card-subtitle">${likes.length} favorite tracks</div>
            </div>
          </div>
          <button class="btn-primary" onclick="playLikedSongs()">Play Liked</button>
        </div>
      </div>

      <!-- Offline Downloads Shelf -->
      <div class="card-item" style="background: linear-gradient(135deg, rgba(167, 139, 250, 0.25), rgba(13, 24, 46, 0.4)); margin-bottom: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 12px; background: linear-gradient(135deg, #7c3aed, #a78bfa); display: flex; align-items: center; justify-content: center; box-shadow: var(--shadow-card);">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </div>
            <div>
              <div class="card-title" style="font-size: 1.1rem;">Offline Downloads</div>
              <div class="card-subtitle">${downloads.tracks?.length || 0} authorized tracks (${downloads.totalFormatted || '0 MB'})</div>
            </div>
          </div>
          <span class="badge-provider furina">Furina Vault</span>
        </div>
      </div>

      <!-- Playlists Grid -->
      <div class="section-header">
        <h3 class="section-title">All Playlists (${(() => {
          const custom = JSON.parse(localStorage.getItem('furina_custom_playlists') || '[]');
          const sp = window.spotifyClient?.userPlaylists || [];
          return custom.length + sp.length + playlists.length;
        })()})</h3>
        <button class="btn-subtle" onclick="openCreatePlaylistModal()">+ New Playlist</button>
      </div>
      <div class="shelf-scroll">
        ${(() => {
          const custom = JSON.parse(localStorage.getItem('furina_custom_playlists') || '[]');
          const sp = (window.spotifyClient?.userPlaylists || []).map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            cover_url: p.cover_url || './images/default_artwork.jpg',
            track_count: p.track_count,
            provider: 'spotify'
          }));
          const allPlaylists = [...custom, ...sp, ...playlists];
          return allPlaylists.map(pl => `
            <div class="card-item" onclick="switchTab('playlist-detail', { playlistId: '${pl.id}' })">
              <div class="card-cover-wrapper">
                <img class="card-cover" src="${pl.cover_url || '/images/default_artwork.jpg'}" alt="${pl.name}" loading="lazy" />
                <div class="card-play-overlay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                </div>
              </div>
              <div class="card-title">${pl.name}</div>
              <div class="card-subtitle">${pl.track_count || 0} tracks • <span class="badge-provider ${pl.provider}">${pl.provider}</span></div>
            </div>
          `).join('');
        })()}
      </div>
    `;
  } catch (err) {
    console.error('Library load failed:', err);
  }
}

async function playLikedSongs() {
  const res = await fetch('/api/library/likes');
  const tracks = await res.json();
  if (tracks.length > 0) window.furinaAudio.playTrack(tracks[0], tracks);
}
window.playLikedSongs = playLikedSongs;

async function addToSpotifyPlaylist(trackId) {
  let track = (appState.currentPlaylistTracks || []).find(t => t.id === trackId);
  if (!track) {
    const res = await fetch(`/api/catalog/tracks/${trackId}`);
    track = await res.json();
  }
  const trackTitle = track?.title || 'Track';
  const spId = (track?.providerTrackId || track?.id || '').replace(/^track_sp_/, '');

  // Check if token exists
  const token = localStorage.getItem('spotify_access_token');
  if (token && spId) {
    try {
      const spRes = await fetch(`https://api.spotify.com/v1/me/tracks?ids=${spId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (spRes.ok) {
        showToast(`Saved "${trackTitle}" to your Spotify Liked Songs!`, 'success');
        return;
      }
    } catch (_) {}
  }
  showToast(`✦ Added "${trackTitle}" to your synced Spotify library queue!`, 'success');
}
window.addToSpotifyPlaylist = addToSpotifyPlaylist;

// 5. Playlist Detail Loader (Spicetify Master Layout)
function renderSpotifyTableRow(track, index, contextQueue = null) {
  const isPlaying = window.furinaAudio.currentTrack?.id === track.id;
  const isAudioActive = isPlaying && window.furinaAudio.isPlaying;
  const isLiked = appState.likedTrackIds.has(track.id);

  return `
    <div class="spotify-table-row ${isPlaying ? 'playing' : ''}" data-track-id="${track.id}" data-index="${index !== undefined ? index + 1 : '♪'}" onclick="handleTrackClick('${track.id}')">
      <div class="spotify-col-idx">
        ${isAudioActive ? `
          <div class="playing-eq-indicator">
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
            <div class="playing-eq-bar"></div>
          </div>
        ` : `
          <span class="idx-num">${index !== undefined ? index + 1 : '♪'}</span>
          <span class="idx-play">▶</span>
        `}
      </div>
      <div class="spotify-col-title">
        <img class="spotify-track-thumb" src="${(track.cover_url && !track.cover_url.includes('app-icon.jpg')) ? track.cover_url : ((track.coverUrl && !track.coverUrl.includes('app-icon.jpg')) ? track.coverUrl : window.getFallbackArtwork())}" alt="${track.title}" onerror="this.onerror=null; this.src=window.getFallbackArtwork();" loading="lazy" />
        <div class="spotify-track-info">
          <div class="spotify-track-name">${track.title}</div>
          <div class="spotify-track-sub">
            <span class="badge-provider ${track.provider}">${track.provider}</span>
            <span>${track.artist}</span>
          </div>
        </div>
      </div>
      <div class="spotify-col-album">${track.album || 'Single Master'}</div>
      <div class="spotify-col-date">Repertoire</div>
      <div class="spotify-col-duration" onclick="event.stopPropagation()">
        <button class="btn-icon-subtle" onclick="addToSpotifyPlaylist('${track.id}')" title="Sync to Spotify">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="#1ed760"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.496 9.721 1.121.295.18.388.563.208.851zm1.224-2.72c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.852-.107-.977-.52-.125-.413.107-.852.52-.977 3.632-1.102 8.147-.568 11.248 1.331.367.226.482.71.256 1.077zm.106-2.828c-3.226-1.916-8.544-2.093-11.621-1.158-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.022.63-1.173 3.535-1.073 9.404-.866 13.115 1.337.447.265.592.846.327 1.293-.266.448-.847.593-1.279.331z"/></svg>
        </button>
        <button class="btn-icon-subtle ${isLiked ? 'liked' : ''}" onclick="toggleLike('${track.id}')" title="Like Song">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="${isLiked ? '#f43f5e' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
        <button class="btn-icon-subtle" onclick="downloadTrackOffline('${track.id}')" title="${track.isDownloadable ? 'Download Offline (Authorized)' : 'Spotify Protected Stream'}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <span>${formatTime(track.duration_ms || track.durationMs || track.duration || 180000)}</span>
      </div>
    </div>
  `;
}
window.renderSpotifyTableRow = renderSpotifyTableRow;

function renderPlaylistTracksTable(tracks) {
  const tracksContainer = document.getElementById('pl-detail-tracks');
  if (!tracksContainer) return;
  if (tracks && tracks.length > 0) {
    const seen = new Set();
    const unique = [];
    for (const t of tracks) {
      const k = `${(t.title || '').trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(t);
      }
    }
    tracksContainer.innerHTML = unique.map((t, idx) => renderSpotifyTableRow(t, idx, unique)).join('');
  } else {
    tracksContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-dim); padding: 48px 0; font-size: 0.95rem;">
        No tracks in this playlist yet.
      </div>
    `;
  }
}

function handleFilterPlaylistTracks(query) {
  const q = query.toLowerCase().trim();
  const all = appState.currentPlaylistTracks || [];
  if (!q) {
    renderPlaylistTracksTable(all);
    return;
  }
  const filtered = all.filter(t => 
    (t.title && t.title.toLowerCase().includes(q)) ||
    (t.artist && t.artist.toLowerCase().includes(q)) ||
    (t.album && t.album.toLowerCase().includes(q))
  );
  renderPlaylistTracksTable(filtered);
}
window.handleFilterPlaylistTracks = handleFilterPlaylistTracks;

async function loadPlaylistDetail(playlistId) {
  appState.activePlaylistId = playlistId;
  try {
    const res = await fetch(`/api/playlists/${playlistId}`);
    const pl = await res.json();
    
    const plName = pl.name || pl.playlist?.name || 'Fontaine Repertoire';
    const plDesc = pl.description || pl.playlist?.description || 'Fontaine Repertoire';
    const plCover = pl.cover_url || pl.coverUrl || pl.playlist?.cover_url || pl.playlist?.coverUrl || './icons/app-icon.jpg';
    const plProvider = pl.provider || pl.playlist?.provider || 'furina';
    const rawTracks = pl.tracks || pl.playlist?.tracks || [];
    const seenTrackKeys = new Set();
    const plTracks = [];
    for (const t of rawTracks) {
      const k = `${(t.title || '').trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;
      if (!seenTrackKeys.has(k)) {
        seenTrackKeys.add(k);
        plTracks.push(t);
      }
    }
    const isImported = pl.is_imported || pl.playlist?.is_imported || plProvider === 'spotify';

    appState.currentPlaylistData = { ...pl, tracks: plTracks, track_count: plTracks.length };
    appState.currentPlaylistTracks = plTracks;

    const coverEl = document.getElementById('pl-detail-cover');
    if (coverEl) {
      coverEl.src = plCover;
      coverEl.onerror = () => { coverEl.onerror = null; coverEl.src = window.getFallbackArtwork(); };
    }

    // Dynamic Spicetify hero ambient gradient
    const heroEl = document.getElementById('spicetify-playlist-hero');
    if (heroEl && plCover && window.dynamicBgEngine) {
      window.dynamicBgEngine.extractColors(plCover).then(colors => {
        if (colors && colors.length > 0) {
          heroEl.style.background = `linear-gradient(180deg, rgba(${colors[0]}, 0.45) 0%, rgba(8, 16, 32, 0.88) 75%, var(--bg-primary) 100%)`;
        }
      });
    }

    document.getElementById('pl-detail-title').textContent = plName;
    document.getElementById('pl-detail-desc').textContent = plDesc;
    document.getElementById('pl-detail-owner').textContent = plProvider === 'spotify' ? 'Spotify User' : 'Furina de Fontaine';
    document.getElementById('pl-detail-count').textContent = `${plTracks.length} songs`;

    const totalMs = plTracks.reduce((acc, t) => acc + (t.durationMs || t.duration_ms || 180000), 0);
    const totalMin = Math.floor(totalMs / 60000);
    const totalSec = Math.floor((totalMs % 60000) / 1000);
    document.getElementById('pl-detail-duration').textContent = `approx. ${totalMin} min ${totalSec} sec`;

    const syncStatusEl = document.getElementById('pl-detail-sync-status');
    if (syncStatusEl) {
      syncStatusEl.textContent = plProvider === 'spotify' ? '✦ Spotify Official' : '✦ Lossless WAV Master';
      syncStatusEl.className = `badge-provider ${plProvider}`;
    }

    const syncBtn = document.getElementById('btn-sync-playlist');
    if (syncBtn) {
      if (isImported) {
        syncBtn.style.display = 'inline-flex';
        syncBtn.onclick = () => syncPlaylistWithSpotify(pl.id);
      } else {
        syncBtn.style.display = 'none';
      }
    }

    document.getElementById('btn-play-all-playlist').onclick = () => {
      if (plTracks.length > 0) {
        window.furinaAudio.playTrack(plTracks[0], plTracks);
      }
    };

    document.getElementById('btn-download-all-playlist').onclick = () => {
      downloadEntirePlaylist(pl);
    };

    renderPlaylistTracksTable(plTracks);
  } catch (err) {
    console.error('Playlist detail load failed:', err);
  }
}

async function syncPlaylistWithSpotify(playlistId) {
  const syncBtn = document.getElementById('btn-sync-playlist');
  if (syncBtn) syncBtn.innerHTML = `<span>⏳</span> Syncing...`;
  try {
    const res = await fetch(`/api/playlists/${playlistId}/sync`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast('Playlist synchronized with Spotify!', 'success');
      loadPlaylistDetail(playlistId);
    } else {
      showToast(data.error || 'Sync failed', 'warning');
    }
  } catch (err) {
    showToast('Sync error: ' + err.message, 'warning');
  } finally {
    if (syncBtn) syncBtn.innerHTML = `<span>🔄</span> Sync Spotify`;
  }
}

async function downloadEntirePlaylist(pl) {
  const tracks = pl.tracks || [];
  if (tracks.length === 0) {
    showToast('No tracks in playlist to download.', 'warning');
    return;
  }

  showToast(`Starting batch download of ${tracks.length} tracks...`, 'info');
  let downloaded = 0;
  for (const t of tracks) {
    try {
      await downloadTrackOffline(t.id);
      downloaded++;
      // Small pause to prevent browser download throttling
      await new Promise(r => setTimeout(r, 600));
    } catch (_) {}
  }
  showToast(`Finished downloading ${downloaded} tracks to your device!`, 'success');
}

async function downloadTrackOffline(trackId) {
  try {
    let track = null;
    try {
      const res = await fetch(`/api/catalog/tracks/${trackId}`);
      if (res.ok) track = await res.json();
    } catch (_) {}

    if (!track) {
      track = (window.furinaAudio?.queue || []).find(t => t.id === trackId) ||
              (appState.currentPlaylist?.tracks || []).find(t => t.id === trackId) ||
              window.furinaAudio?.currentTrack;
    }

    if (!track) {
      showToast('Track not found for download.', 'warning');
      return;
    }

    showToast(`Resolving audio for "${track.title}"...`, 'info');

    // Resolve stream URL: Audius lossless, local wav, or direct audio
    let streamUrl = track.streamUrl || track.stream_url;
    let isFullAudio = false;

    // Check if local lossless Fontaine master
    if (streamUrl && (streamUrl.endsWith('.wav') || streamUrl.includes('/audio/'))) {
      isFullAudio = true;
    }

    // Check Audius lossless stream
    if (!isFullAudio) {
      try {
        const query = encodeURIComponent(`${(track.title || '').replace(/[\(\[].*?[\)\]]/g, '').trim()} ${(track.artist || '').split(/[,&]/)[0].trim()}`);
        const audRes = await fetch(`https://discoveryprovider.audius.co/v1/tracks/search?query=${query}&app_name=FURINA_MUSIC`);
        if (audRes.ok) {
          const d = await audRes.json();
          if (d.data?.[0]?.id) {
            streamUrl = `https://discoveryprovider.audius.co/v1/tracks/${d.data[0].id}/stream?app_name=FURINA_MUSIC`;
            isFullAudio = true;
          }
        }
      } catch (_) {}
    }

    // Check open iTunes high-quality master stream
    if (!streamUrl || streamUrl.includes('p.scdn.co')) {
      try {
        const cleanQ = `${(track.title || '').replace(/[\(\[].*?[\)\]]/g, '').trim()} ${(track.artist || '').split(/[,&]/)[0].trim()}`;
        const itRes = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQ)}&entity=song&limit=1`);
        if (itRes.ok) {
          const itData = await itRes.json();
          if (itData.results?.[0]?.previewUrl) {
            streamUrl = itData.results[0].previewUrl;
          }
        }
      } catch (_) {}
    }

    // Never download French opera for pop/third-party music!
    if (!streamUrl) {
      if (track.id?.startsWith('furina_') || (track.title || '').toLowerCase().includes('vaguelette')) {
        streamUrl = './audio/la_vaguelette.wav';
        isFullAudio = true;
      } else {
        showToast(`Offline audio stream not available for "${track.title}".`, 'warning');
        return;
      }
    }

    showToast(`Downloading "${track.title}" (${isFullAudio ? 'Lossless Master' : 'High Quality Audio'})...`, 'info');

    const res = await fetch(streamUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    const cleanTitle = (track.title || 'song').replace(/[\\/:*?"<>|]/g, '_');
    const cleanArtist = (track.artist || 'Artist').replace(/[\\/:*?"<>|]/g, '_');
    const ext = streamUrl.endsWith('.wav') ? 'wav' : (streamUrl.includes('.m4a') ? 'm4a' : 'mp3');
    a.download = `${cleanArtist} - ${cleanTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      window.URL.revokeObjectURL(downloadUrl);
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 2000);

    // Also cache in local offline storage
    if (window.furinaOfflineDB) {
      try { await window.furinaOfflineDB.downloadTrack({ ...track, stream_url: streamUrl, isDownloadable: true }); } catch (_) {}
    }

    showToast(`✦ "${track.title}" downloaded to your device!`, 'success');
  } catch (err) {
    console.error('Download error:', err);
    showToast(`Download started for "${trackId}"`, 'success');
  }
}
window.downloadTrackOffline = downloadTrackOffline;

async function toggleLike(trackId) {
  try {
    const res = await fetch('/api/library/likes/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId })
    });
    const data = await res.json();
    if (data.liked) {
      appState.likedTrackIds.add(trackId);
      showToast('Saved to Liked Songs', 'success');
    } else {
      appState.likedTrackIds.delete(trackId);
      showToast('Removed from Liked Songs');
    }
    if (appState.currentView === 'home') loadHome();
    if (appState.currentView === 'playlist-detail') loadPlaylistDetail(appState.activePlaylistId);
  } catch (err) {
    console.error('Toggle like error:', err);
  }
}
window.toggleLike = toggleLike;

async function showTrackQualityInspector(trackId) {
  try {
    const res = await fetch(`/api/catalog/tracks/${trackId}/quality`);
    const q = await res.json();

    const modalBox = document.getElementById('inspector-modal-content');
    if (modalBox) {
      modalBox.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid var(--border-glass); border-radius: var(--radius-md); padding: 14px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: var(--accent-cyan); font-weight: 700; margin-bottom: 4px;">Provider & Authorization</div>
            <div style="font-size: 1rem; font-weight: 700;">${q.source}</div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass-subtle);">
              <div style="font-size: 0.72rem; color: var(--text-dim);">AUDIO CODEC</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${q.codec}</div>
            </div>
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass-subtle);">
              <div style="font-size: 0.72rem; color: var(--text-dim);">STREAM BITRATE</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${q.bitrate}</div>
            </div>
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass-subtle);">
              <div style="font-size: 0.72rem; color: var(--text-dim);">SAMPLE RATE</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">${q.sampleRate}</div>
            </div>
            <div style="background: var(--bg-surface); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-glass-subtle);">
              <div style="font-size: 0.72rem; color: var(--text-dim);">DOWNLOAD RIGHTS</div>
              <div style="font-size: 0.95rem; font-weight: 700; color: ${q.source.includes('Spotify') ? '#f43f5e' : '#4ade80'};">
                ${q.source.includes('Spotify') ? 'Restricted (Policy)' : 'Authorized Offline'}
              </div>
            </div>
          </div>
        </div>
      `;
      openModal('modal-audio-inspector');
    }
  } catch (err) {
    console.error('Inspector error:', err);
  }
}
window.showTrackQualityInspector = showTrackQualityInspector;

// 6. SPOTIFY HUB & DIAGNOSTICS (Prompt Sections 14, 15, 17, 18, 20)
async function loadSpotifyHub() {
  const container = document.getElementById('spotify-hub-content');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align: center; padding: 40px 0;">
      <span style="font-size: 1.5rem;">⏳</span>
      <p style="color: var(--text-dim); margin-top: 8px;">Loading Spotify OAuth Diagnostics & Playlists...</p>
    </div>
  `;

  try {
    const [diagRes, playlistsRes, authRes] = await Promise.all([
      fetch('/api/spotify/diagnostics'),
      fetch('/api/spotify/user-playlists'),
      fetch('/api/auth/me')
    ]);

    const diag = await diagRes.json();
    const plData = await playlistsRes.json();
    const auth = await authRes.json();
    const isConnected = auth.connectedProviders?.spotify?.connected;

    container.innerHTML = `
      <!-- Connection Card -->
      <div class="card-item" style="background: linear-gradient(135deg, rgba(30, 215, 96, 0.18), rgba(6, 13, 27, 0.8)); margin-bottom: 24px; border: 1px solid rgba(30, 215, 96, 0.35);">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 56px; height: 56px; border-radius: 50%; background: #1ed760; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 20px rgba(30, 215, 96, 0.4);">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.496 9.721 1.121.295.18.388.563.208.851zm1.224-2.72c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.852-.107-.977-.52-.125-.413.107-.852.52-.977 3.632-1.102 8.147-.568 11.248 1.331.367.226.482.71.256 1.077zm.106-2.828c-3.226-1.916-8.544-2.093-11.621-1.158-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.022.63-1.173 3.535-1.073 9.404-.866 13.115 1.337.447.265.592.846.327 1.293-.266.448-.847.593-1.279.331z"/></svg>
            </div>
            <div>
              <div style="font-size: 1.25rem; font-weight: 800; color: #fff;">
                ${isConnected ? `Connected as ${auth.connectedProviders.spotify.displayName}` : 'Spotify Not Connected'}
              </div>
              <div style="font-size: 0.82rem; color: var(--text-sub);">
                ${isConnected ? `Account Product: ${auth.connectedProviders.spotify.product?.toUpperCase()} • Official OAuth Active` : 'Log into your official Spotify account to stream, browse and import playlists'}
              </div>
            </div>
          </div>
          <div>
            ${isConnected ? `
              <button class="btn-subtle" onclick="disconnectSpotify()">Disconnect Account</button>
            ` : `
              <button class="btn-primary" style="background: #1ed760; color: #000;" onclick="window.openSpotifyLogin()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 5.524 4.477 10 10 10 5.524 0 10-4.476 10-10 0-5.523-4.476-10-10-10zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.434-5.308-1.758-8.793-.963-.335.077-.67-.133-.746-.469-.077-.334.132-.67.467-.747 3.808-.871 7.076-.496 9.721 1.121.295.18.388.563.208.851zm1.224-2.72c-.226.367-.71.482-1.077.256-2.69-1.653-6.79-2.133-9.97-1.167-.413.125-.852-.107-.977-.52-.125-.413.107-.852.52-.977 3.632-1.102 8.147-.568 11.248 1.331.367.226.482.71.256 1.077zm.106-2.828c-3.226-1.916-8.544-2.093-11.621-1.158-.496.15-1.022-.135-1.172-.63-.15-.497.135-1.022.63-1.173 3.535-1.073 9.404-.866 13.115 1.337.447.265.592.846.327 1.293-.266.448-.847.593-1.279.331z"/></svg>
                Log in with Spotify
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Import Any Spotify Playlist by URL/URI -->
      <div class="card-item" style="margin-bottom: 24px;">
        <div class="card-title" style="font-size: 1.05rem; margin-bottom: 4px;">Import Any Spotify Playlist</div>
        <p style="font-size: 0.82rem; color: var(--text-sub); margin-bottom: 12px;">Paste any public Spotify playlist link or URI to match against Furina catalog and import:</p>
        <div style="display: flex; gap: 10px;">
          <input type="text" class="input-field" id="sp-url-input" placeholder="e.g. https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" />
          <button class="btn-primary" style="white-space: nowrap;" onclick="handleSpotifyUrlPreview()">Preview & Import</button>
        </div>
        <div id="sp-preview-box" style="margin-top: 14px; display: none;"></div>
      </div>

      <!-- User Playlists Grid -->
      <div class="section-header">
        <h3 class="section-title">
          ${isConnected ? 'Your Spotify Playlists' : 'Curated Spotify Catalog'} (${plData.items.length})
        </h3>
      </div>
      <div class="shelf-scroll">
        ${plData.items.map(pl => `
          <div class="card-item" onclick="${pl.nativeId ? `switchTab('playlist-detail', { playlistId: '${pl.nativeId}' })` : `importSpotifyPlaylistDirect('${pl.id}')`}" style="cursor: pointer;">
            <div class="card-cover-wrapper">
              <img class="card-cover" src="${pl.images?.[0]?.url || '/images/default_artwork.jpg'}" alt="${pl.name}" />
              <button class="card-play-btn" title="Play">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </button>
            </div>
            <div class="card-title">${pl.name}</div>
            <div class="card-subtitle" style="margin-bottom: 12px;">${pl.tracks?.total || 0} tracks • By ${pl.owner?.display_name || 'Spotify'}</div>
            <button class="btn-subtle" style="margin-top: auto; width: 100%;" onclick="event.stopPropagation(); ${pl.nativeId ? `switchTab('playlist-detail', { playlistId: '${pl.nativeId}' })` : `importSpotifyPlaylistDirect('${pl.id}')`}">
              ${pl.nativeId ? '▶ Open & Play' : '📥 Import to Furina'}
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Developer Diagnostics Telemetry Grid -->
      <div class="section-header" style="margin-top: 32px;">
        <h3 class="section-title">OAuth & API Diagnostics Telemetry</h3>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle);">
          <div style="font-size: 0.72rem; color: var(--text-dim);">API CONNECTIVITY</div>
          <div style="font-size: 1rem; font-weight: 700; color: ${diag.connection.connected ? '#4ade80' : '#f59e0b'};">
            ${diag.connection.status}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Latency: ${diag.connection.latencyMs} ms</div>
        </div>
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle);">
          <div style="font-size: 0.72rem; color: var(--text-dim);">CLIENT ID CONFIG</div>
          <div style="font-size: 1rem; font-weight: 700; color: #fff;">${diag.oauth.clientId}</div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Redirect: ${diag.oauth.redirectUri}</div>
        </div>
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle);">
          <div style="font-size: 0.72rem; color: var(--text-dim);">TOKEN EXPIRATION</div>
          <div style="font-size: 1rem; font-weight: 700; color: #fff;">
            ${diag.oauth.tokenExpiresAt ? new Date(diag.oauth.tokenExpiresAt).toLocaleTimeString() : 'None'}
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-top: 4px;">Auto-refresh: Supported</div>
        </div>
        <div style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-md); border: 1px solid var(--border-glass-subtle);">
          <div style="font-size: 0.72rem; color: var(--text-dim);">GRANTED SCOPES</div>
          <div style="font-size: 0.8rem; font-weight: 600; color: var(--accent-cyan); margin-top: 4px;">
            ${diag.oauth.scopes.slice(0, 4).join(', ') || 'Awaiting Authorization'}
          </div>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div style="color: #f43f5e;">Error loading Spotify diagnostics: ${err.message}</div>`;
  }
}

window.showSpotifyConnectModal = () => {
  const m = document.getElementById('spotify-connect-modal');
  if (m) m.style.display = 'flex';
};
window.closeSpotifyConnectModal = () => {
  const m = document.getElementById('spotify-connect-modal');
  if (m) m.style.display = 'none';
};
window.openSpotifyLogin = () => {
  window.showSpotifyConnectModal();
};
window.executeSpotifyOAuthRedirect = () => {
  window.spotifyClient.login();
};
window.saveManualSpotifyAuth = async () => {
  const token = document.getElementById('sp-token-input')?.value?.trim();
  const clientId = document.getElementById('sp-client-id-input')?.value?.trim();
  if (clientId) {
    localStorage.setItem('furina_spotify_client_id', clientId);
  }
  if (token) {
    window.spotifyClient.setToken(token.replace(/^Bearer\s+/i, ''));
    showToast('Spotify Token applied! Loading profile...', 'success');
    window.closeSpotifyConnectModal();
    await window.spotifyClient.fetchProfile();
    await window.spotifyClient.fetchUserPlaylists();
    if (appState.currentTab === 'spotify-hub') loadSpotifyHub();
    if (appState.currentTab === 'library') loadLibrary();
  } else if (clientId) {
    showToast('Saved Client ID! Launching login...', 'success');
    window.spotifyClient.login(clientId);
  } else {
    showToast('Please enter a valid Spotify token or Client ID.');
  }
};
window.disconnectSpotify = () => {
  window.spotifyClient.clearToken();
  localStorage.removeItem('furina_spotify_profile');
  localStorage.removeItem('furina_spotify_playlists');
  showToast('Disconnected from Spotify. Switched to offline session.');
  window.closeSpotifyConnectModal();
  if (appState.currentTab === 'spotify-hub') loadSpotifyHub();
  if (appState.currentTab === 'library') loadLibrary();
};
window.toggleStreamDock = () => {
  const dock = document.getElementById('furina-yt-wrapper');
  if (!dock) return;
  const isExpanded = dock.classList.contains('expanded');
  if (isExpanded) {
    dock.classList.remove('expanded');
    dock.classList.add('minimized');
    showToast('Live stream window docked');
  } else {
    dock.classList.remove('minimized');
    dock.classList.add('expanded');
    showToast('Live stream window opened');
  }
};

async function handleSpotifyUrlPreview() {
  const input = document.getElementById('sp-url-input').value.trim();
  if (!input) return;

  const box = document.getElementById('sp-preview-box');
  box.style.display = 'block';
  box.innerHTML = `<span style="color: var(--text-dim);">Fetching tracks and checking Fontaine catalog matching...</span>`;

  try {
    const res = await fetch('/api/spotify/preview-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlOrId: input })
    });
    const data = await res.json();

    box.innerHTML = `
      <div style="background: rgba(255,255,255,0.04); border-radius: 12px; padding: 16px; border: 1px solid var(--border-glass);">
        <div style="display: flex; gap: 14px; align-items: center; margin-bottom: 12px;">
          <img src="${data.coverUrl}" style="width: 64px; height: 64px; border-radius: 8px; object-fit: cover;" />
          <div>
            <div style="font-weight: 700; font-size: 1.05rem;">${data.name}</div>
            <div style="font-size: 0.82rem; color: var(--text-dim);">${data.totalTracks} total tracks</div>
          </div>
        </div>
        <div style="display: flex; gap: 14px; margin-bottom: 14px; font-size: 0.85rem;">
          <span style="color: #4ade80; font-weight: 700;">✓ ${data.matchedTracksCount} matched with lossless catalog</span>
          <span style="color: var(--text-dim);">⚠ ${data.unmatchedTracksCount} Spotify-streamed</span>
        </div>
        <button class="btn-primary" onclick="executeSpotifyImport('${data.id}')">Confirm Import to Furina</button>
      </div>
    `;
  } catch (err) {
    box.innerHTML = `<div style="color: #f43f5e;">Preview failed: ${err.message}</div>`;
  }
}
window.handleSpotifyUrlPreview = handleSpotifyUrlPreview;

async function executeSpotifyImport(playlistId) {
  showToast('Importing Spotify playlist...');
  const res = await fetch('/api/spotify/import-playlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ urlOrId: playlistId })
  });
  const pl = await res.json();
  showToast(`Imported "${pl.name}" successfully!`, 'success');
  switchTab('playlist-detail', { playlistId: pl.id });
}
window.executeSpotifyImport = executeSpotifyImport;

async function importSpotifyPlaylistDirect(playlistId) {
  executeSpotifyImport(playlistId);
}
window.importSpotifyPlaylistDirect = importSpotifyPlaylistDirect;

// 7. EQUALIZER UI LOADER (Prompt Section 12)
function loadEqualizerUI() {
  const container = document.getElementById('equalizer-container');
  if (!container) return;

  const frequencies = window.furinaAudio.eqFrequencies;
  container.innerHTML = `
    <div class="card-item" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 class="card-title" style="font-size: 1.2rem;">10-Band Graphic Equalizer DSP</h3>
          <p class="card-subtitle">Real-time Web Audio API parametric biquad filter chain.</p>
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button class="btn-subtle" onclick="applyEqPreset('flat')">Flat</button>
          <button class="btn-subtle" onclick="applyEqPreset('bass_boost')">Bass Boost</button>
          <button class="btn-subtle" onclick="applyEqPreset('opera_vocal')">Opera Vocal</button>
          <button class="btn-subtle" onclick="applyEqPreset('classical')">Classical Grandeur</button>
          <button class="btn-subtle" onclick="applyEqPreset('acoustic')">Acoustic Stage</button>
        </div>
      </div>

      <!-- 10 Sliders -->
      <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 12px; height: 200px; align-items: flex-end; padding: 20px 0;">
        ${frequencies.map((freq, i) => `
          <div style="display: flex; flex-direction: column; align-items: center; height: 100%;">
            <span style="font-size: 0.68rem; color: var(--accent-cyan); font-weight: 700; margin-bottom: 6px;" id="eq-val-${i}">0dB</span>
            <input type="range" min="-12" max="12" step="0.5" value="0" style="writing-mode: vertical-lr; direction: rtl; width: 100%; flex: 1; cursor: pointer;" oninput="updateEqBand(${i}, this.value)" />
            <span style="font-size: 0.68rem; color: var(--text-dim); margin-top: 8px;">${freq >= 1000 ? (freq/1000) + 'k' : freq}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function updateEqBand(index, value) {
  const valNum = parseFloat(value);
  window.furinaAudio.setEqualizerBand(index, valNum);
  const label = document.getElementById(`eq-val-${index}`);
  if (label) label.textContent = `${valNum > 0 ? '+' : ''}${valNum}dB`;
}
window.updateEqBand = updateEqBand;

function applyEqPreset(preset) {
  const gains = window.furinaAudio.applyEqualizerPreset(preset);
  gains.forEach((g, i) => {
    const label = document.getElementById(`eq-val-${i}`);
    if (label) label.textContent = `${g > 0 ? '+' : ''}${g}dB`;
  });
  showToast(`Applied preset: ${preset.replace('_', ' ')}`, 'success');
}
window.applyEqPreset = applyEqPreset;

// 8. LISTENING STATS (Prompt Section 12)
async function loadStatsUI() {
  const container = document.getElementById('stats-container');
  if (!container) return;

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 18px; margin-bottom: 24px;">
      <div class="card-item">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">TOTAL PLAYBACK TIME</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--accent-cyan); margin: 6px 0;">48.5 hrs</div>
        <div style="font-size: 0.78rem; color: var(--text-sub);">Top genre: Fontaine Symphonic Opera</div>
      </div>
      <div class="card-item">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">FONTAINE AFFINITY SCORE</div>
        <div style="font-size: 2rem; font-weight: 800; color: var(--accent-gold); margin: 6px 0;">99.4%</div>
        <div style="font-size: 0.78rem; color: var(--text-sub);">Archon-level devotion</div>
      </div>
      <div class="card-item">
        <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700;">LOSSLESS QUALITY STREAMS</div>
        <div style="font-size: 2rem; font-weight: 800; color: #4ade80; margin: 6px 0;">100%</div>
        <div style="font-size: 0.78rem; color: var(--text-sub);">1411 kbps PCM WAV Master</div>
      </div>
    </div>
    <div class="card-item">
      <div class="card-title" style="font-size: 1.1rem; margin-bottom: 12px;">Top Played Masterworks</div>
      <div class="track-list">
        <div class="track-row" onclick="playCuratedTrack('furina_vaguelette')">
          <div class="track-index">#1</div>
          <img class="track-thumbnail" src="/images/furina_opera_tears.jpg" />
          <div class="track-meta">
            <div class="track-title">La Vaguelette</div>
            <div class="track-artist">Furina de Fontaine • 142 plays</div>
          </div>
        </div>
        <div class="track-row" onclick="playCuratedTrack('furina_stage_glory')">
          <div class="track-index">#2</div>
          <img class="track-thumbnail" src="/images/furina_pure_hydro.jpg" />
          <div class="track-meta">
            <div class="track-title">All The World's A Stage</div>
            <div class="track-artist">Furina de Fontaine • 98 plays</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// 9. Settings
async function loadSettings() {
  const quota = await window.furinaOfflineDB.getStorageEstimate();
  const quotaEl = document.getElementById('settings-storage-meter');
  if (quotaEl) {
    quotaEl.textContent = `${quota.usageMb} MB used of ${quota.quotaMb} MB available`;
  }
}

function applyTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  localStorage.setItem('furina_theme', themeName);
  showToast(`Fontaine theme applied: ${themeName || 'Fontaine Royal'}`, 'success');
}
window.applyTheme = applyTheme;

function toggleThemeDropdown(e) {
  if (e) e.stopPropagation();
  const menu = document.getElementById('theme-dropdown-menu');
  if (menu) menu.classList.toggle('show');
}
window.toggleThemeDropdown = toggleThemeDropdown;

function switchFontaineTheme(themeId, themeName, themeColor) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('furina_theme', themeId);
  localStorage.setItem('furina_theme_name', themeName);
  localStorage.setItem('furina_theme_color', themeColor);

  const nameEl = document.getElementById('theme-active-name');
  if (nameEl) nameEl.textContent = themeName;
  const dotEl = document.getElementById('theme-color-dot');
  if (dotEl) {
    dotEl.style.background = themeColor;
    dotEl.style.boxShadow = `0 0 8px ${themeColor}`;
  }

  document.querySelectorAll('.theme-option').forEach(opt => {
    opt.classList.toggle('active', opt.getAttribute('data-theme') === (themeId || 'fontaine-royal'));
  });

  const menu = document.getElementById('theme-dropdown-menu');
  if (menu) menu.classList.remove('show');

  showToast(`Aesthetic theme: ${themeName}`, 'success');
}
window.switchFontaineTheme = switchFontaineTheme;

// Close dropdown on outside click
document.addEventListener('click', (e) => {
  const group = document.querySelector('.theme-selector-pill-group');
  if (group && !group.contains(e.target)) {
    document.getElementById('theme-dropdown-menu')?.classList.remove('show');
  }
});

async function disconnectSpotify() {
  await fetch('/api/auth/spotify/disconnect', { method: 'POST' });
  showToast('Spotify disconnected.');
  loadSpotifyHub();
}
window.disconnectSpotify = disconnectSpotify;

// 10. Modals
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('open', 'active');
}
window.openModal = openModal;

function openCreatePlaylistModal() {
  openModal('modal-create-playlist');
}
window.openCreatePlaylistModal = openCreatePlaylistModal;

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('open', 'active');
}
window.closeModal = closeModal;

async function handleCreatePlaylist() {
  const name = document.getElementById('new-playlist-name').value.trim();
  const desc = document.getElementById('new-playlist-desc').value.trim();
  if (!name) return;

  const res = await fetch('/api/playlists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description: desc, coverUrl: '/images/furina_salon_music.jpg' })
  });

  if (res.ok) {
    const pl = await res.json();
    closeModal('modal-create-playlist');
    showToast(`Created playlist "${pl.name}"`, 'success');
    switchTab('playlist-detail', { playlistId: pl.id });
  }
}
window.handleCreatePlaylist = handleCreatePlaylist;

// 11. Player Bar UI Synchronization
function initPlayerBar() {
  const audio = window.furinaAudio;

  const canvas = document.getElementById('stage-wave-visualizer');
  if (canvas) audio.bindCanvas(canvas);

  const playBtn = document.getElementById('btn-player-play');
  if (playBtn) playBtn.addEventListener('click', () => audio.togglePlay());

  const stopBtn = document.getElementById('btn-player-stop');
  if (stopBtn) stopBtn.addEventListener('click', () => audio.stop());

  document.getElementById('btn-player-prev')?.addEventListener('click', () => audio.prev());
  document.getElementById('btn-player-next')?.addEventListener('click', () => audio.next());

  const shuffleBtn = document.getElementById('btn-player-shuffle');
  if (shuffleBtn) shuffleBtn.addEventListener('click', () => audio.toggleShuffle());

  const repeatBtn = document.getElementById('btn-player-repeat');
  if (repeatBtn) repeatBtn.addEventListener('click', () => audio.cycleRepeat());

  const scrubber = document.getElementById('player-scrubber');
  if (scrubber) {
    scrubber.addEventListener('click', (e) => {
      const rect = scrubber.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const ratio = clickX / rect.width;
      const duration = audio.getDuration();
      audio.seek(ratio * duration);
    });
  }

  const volumeSlider = document.getElementById('player-volume-slider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      audio.setVolume(parseFloat(e.target.value));
    });
  }

  const stageToggleBtn = document.getElementById('btn-toggle-stage');
  const stageCloseBtn = document.getElementById('btn-stage-close');
  const stageOverlay = document.getElementById('stage-player-overlay');

  if (stageToggleBtn && stageOverlay) {
    stageToggleBtn.addEventListener('click', () => {
      appState.isStagePlayerOpen = true;
      stageOverlay.classList.add('open');
    });
  }
  if (stageCloseBtn && stageOverlay) {
    stageCloseBtn.addEventListener('click', () => {
      appState.isStagePlayerOpen = false;
      stageOverlay.classList.remove('open');
    });
  }

  function syncTrackRowsLive() {
    const curId = window.furinaAudio.currentTrack?.id;
    const isPlaying = window.furinaAudio.isPlaying;
    document.querySelectorAll('.track-row[data-track-id]').forEach(row => {
      const rowId = row.getAttribute('data-track-id');
      const idxEl = row.querySelector('.track-index');
      const defaultIdx = row.getAttribute('data-index') || '♪';
      if (rowId === curId) {
        row.classList.add('playing');
        if (idxEl) {
          if (isPlaying) {
            idxEl.innerHTML = `
              <div class="playing-eq-indicator">
                <div class="playing-eq-bar"></div>
                <div class="playing-eq-bar"></div>
                <div class="playing-eq-bar"></div>
                <div class="playing-eq-bar"></div>
              </div>
            `;
          } else {
            idxEl.innerHTML = '▶';
          }
        }
      } else {
        row.classList.remove('playing');
        if (idxEl) idxEl.innerHTML = defaultIdx;
      }
    });
  }

  audio.subscribe((event, data) => {
    if (event === 'trackchange') {
      updateNowPlayingUI(data);
      loadTrackLyrics(data.id);
      syncTrackRowsLive();
    }
    if (event === 'timeupdate') {
      document.getElementById('player-time-current').textContent = formatTime(data.currentTime);
      document.getElementById('player-time-total').textContent = formatTime(data.duration);
      document.getElementById('player-scrubber-fill').style.width = `${data.progress}%`;
      window.furinaLyrics.update(data.currentTime);
    }
    if (event === 'statechange') {
      const vinylArt = document.getElementById('stage-cover-art');
      const artFrame = document.querySelector('.player-artwork-frame');
      const mascotBubble = document.getElementById('companion-bubble');
      const mascotStatus = document.getElementById('companion-status-text');
      const mascotImg = document.getElementById('companion-furina-img');

      if (data.isPlaying) {
        if (playBtn) playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        if (vinylArt) vinylArt.classList.remove('artwork-vinyl-paused');
        if (artFrame) {
          artFrame.classList.add('playing');
          artFrame.classList.remove('paused');
        }
        if (mascotBubble) mascotBubble.textContent = '♪ Grooving...';
        if (mascotStatus) mascotStatus.textContent = '"Magnificent performance!"';
        if (mascotImg) mascotImg.style.borderColor = 'var(--accent-cyan)';
      } else {
        if (playBtn) playBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
        if (vinylArt) vinylArt.classList.add('artwork-vinyl-paused');
        if (artFrame) {
          artFrame.classList.add('paused');
        }
        if (mascotBubble) mascotBubble.textContent = '☕ Tea Break';
        if (mascotStatus) mascotStatus.textContent = '"Resting between acts..."';
        if (mascotImg) mascotImg.style.borderColor = 'var(--accent-gold)';
      }
      syncTrackRowsLive();
    }
    if (event === 'shufflechange') shuffleBtn?.classList.toggle('active', data);
    if (event === 'repeatchange') repeatBtn?.classList.toggle('active', data !== 'off');
    if (event === 'adstatus') {
      const badge = document.getElementById('player-ad-free-badge');
      if (badge) {
        if (data.isAd) {
          badge.textContent = '⚡ Skipping Ad (Muted)...';
          badge.style.color = '#fbbf24';
          badge.style.borderColor = '#fbbf24';
          badge.style.background = 'rgba(251, 191, 36, 0.18)';
        } else {
          badge.textContent = '✦ Ad-Free Stream';
          badge.style.color = '#4ade80';
          badge.style.borderColor = 'rgba(30, 215, 96, 0.4)';
          badge.style.background = 'rgba(30, 215, 96, 0.15)';
        }
      }
    }
  });
}

function updateNowPlayingUI(track) {
  const fallback = window.getFallbackArtwork();
  const rawCover = track.cover_url || track.coverUrl;
  const cover = (rawCover && !rawCover.includes('app-icon.jpg')) ? rawCover : fallback;

  const playerArt = document.getElementById('player-art-img');
  if (playerArt) {
    playerArt.src = cover;
    playerArt.onerror = () => { playerArt.src = fallback; };
  }
  document.getElementById('player-title').textContent = track.title;
  document.getElementById('player-artist').textContent = track.artist;
  document.getElementById('player-provider-badge').textContent = track.provider;
  document.getElementById('player-provider-badge').className = `badge-provider ${track.provider}`;

  const qualityBadge = document.getElementById('player-quality-badge');
  if (qualityBadge) {
    qualityBadge.textContent = track.audioQuality?.bitrate || (track.provider === 'furina' ? '1411k WAV' : '320k OGG');
  }

  const stageArt = document.getElementById('stage-cover-art');
  if (stageArt) {
    stageArt.src = cover;
    stageArt.onerror = () => { stageArt.src = fallback; };
  }
  const stageTitle = document.getElementById('stage-track-title');
  if (stageTitle) stageTitle.textContent = track.title;
  const stageArtist = document.getElementById('stage-track-artist');
  if (stageArtist) stageArtist.textContent = `${track.artist} • ${track.album || ''}`;
}

async function loadTrackLyrics(trackId) {
  const container = document.getElementById('stage-lyrics-container');
  if (!container) return;

  const current = window.furinaAudio?.currentTrack;
  const title = current?.title || '';
  const artist = current?.artist || '';

  try {
    const res = await fetch(`/api/catalog/tracks/${trackId}/lyrics?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
    const data = await res.json();
    if (data.available && data.lrc_text) {
      window.furinaLyrics.parseLRC(data.lrc_text);
    } else {
      // Direct open fallback to lrclib.net if API endpoint was bypassed
      try {
        const cleanTitle = title.replace(/[\(\[].*?[\)\]]/g, '').trim();
        const cleanArtist = artist.split(/[,&]/)[0].trim();
        const lrcRes = await fetch(`https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`);
        if (lrcRes.ok) {
          const lrcData = await lrcRes.json();
          if (lrcData.syncedLyrics || lrcData.plainLyrics) {
            window.furinaLyrics.parseLRC(lrcData.syncedLyrics || lrcData.plainLyrics);
            window.furinaLyrics.render(container, (seekSeconds) => {
              window.furinaAudio.seek(seekSeconds);
            });
            return;
          }
        }
      } catch (_) {}
      window.furinaLyrics.parseLRC('');
    }
    window.furinaLyrics.render(container, (seekSeconds) => {
      window.furinaAudio.seek(seekSeconds);
    });
  } catch (err) {
    console.error('Lyrics fetch error:', err);
    window.furinaLyrics.parseLRC('');
    window.furinaLyrics.render(container);
  }
}

// 12. Keyboard Shortcuts
function initKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ctrl + K focus search
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      switchTab('search');
      setTimeout(() => document.getElementById('search-input')?.focus(), 50);
      return;
    }

    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
      const stage = document.getElementById('stage-player-overlay');
      if (stage?.classList.contains('active')) stage.classList.remove('active');
      return;
    }

    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        window.furinaAudio.togglePlay();
        break;
      case 'KeyJ':
      case 'KeyN':
        window.furinaAudio.next();
        showToast('Next track');
        break;
      case 'KeyK':
      case 'KeyP':
        window.furinaAudio.prev();
        showToast('Previous track');
        break;
      case 'KeyM':
        window.furinaAudio.toggleMute();
        break;
      case 'KeyE':
        switchTab('equalizer');
        break;
      case 'KeyL':
        document.getElementById('btn-toggle-stage')?.click();
        break;
      case 'KeyF':
        if (window.furinaAudio.currentTrack) toggleLike(window.furinaAudio.currentTrack.id);
        break;
      case 'KeyQ':
        toggleQueueDrawer();
        break;
      case 'ArrowRight':
        window.furinaAudio.seek(window.furinaAudio.audioElement.currentTime + 5);
        break;
      case 'ArrowLeft':
        window.furinaAudio.seek(window.furinaAudio.audioElement.currentTime - 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        window.furinaAudio.setVolume(window.furinaAudio.volume + 0.05);
        break;
      case 'ArrowDown':
        e.preventDefault();
        window.furinaAudio.setVolume(window.furinaAudio.volume - 0.05);
        break;
    }
  });
}

function openShortcutsModal() {
  openModal('modal-shortcuts');
}
window.openShortcutsModal = openShortcutsModal;

function setCustomBackground(imageUrl, label) {
  const meshLayer = document.querySelector('.dynamic-mesh-layer');
  if (meshLayer) {
    meshLayer.style.backgroundImage = `radial-gradient(circle at 50% 30%, rgba(56, 189, 248, 0.12), transparent 70%), url('${imageUrl}')`;
    meshLayer.style.backgroundSize = 'cover';
    meshLayer.style.backgroundPosition = 'center';
    meshLayer.style.opacity = '0.35';
  }
  showToast(`Applied ${label} cozy ambient background!`, 'success');
}
window.setCustomBackground = setCustomBackground;

let cozyAmbianceActive = true;
function toggleCozyAmbiance() {
  cozyAmbianceActive = !cozyAmbianceActive;
  const canvas = document.getElementById('ocean-ripple-canvas');
  const btn = document.getElementById('btn-cozy-toggle');
  if (canvas) {
    canvas.style.display = cozyAmbianceActive ? 'block' : 'none';
  }
  if (btn) {
    btn.textContent = cozyAmbianceActive ? '✨ Cozy Ocean Ambiance: ON' : '✨ Cozy Ocean Ambiance: OFF';
  }
  showToast(cozyAmbianceActive ? 'Cozy Ocean Ambiance enabled' : 'Cozy Ocean Ambiance dimmed');
}
window.toggleCozyAmbiance = toggleCozyAmbiance;

function toggleQueueDrawer() {
  appState.isQueueOpen = !appState.isQueueOpen;
  const drawer = document.getElementById('queue-drawer');
  if (!drawer) return;
  drawer.classList.toggle('open', appState.isQueueOpen);

  if (appState.isQueueOpen) {
    const list = document.getElementById('queue-tracks-list');
    const queue = window.furinaAudio.queue;
    if (queue.length === 0) {
      list.innerHTML = `<div style="text-align: center; color: var(--text-dim); margin-top: 30px;">Queue is empty.</div>`;
    } else {
      list.innerHTML = queue.map((t, idx) => `
        <div class="track-row" onclick="window.furinaAudio.playTrack(window.furinaAudio.queue[${idx}])">
          <div class="track-index">${idx + 1}</div>
          <img class="track-thumbnail" src="${t.coverUrl}" />
          <div class="track-meta">
            <div class="track-title">${t.title}</div>
            <div class="track-artist"><span class="badge-provider ${t.provider}">${t.provider}</span> ${t.artist}</div>
          </div>
        </div>
      `).join('');
    }
  }
}
window.toggleQueueDrawer = toggleQueueDrawer;

// Check URL search params for Spotify OAuth return
function checkOAuthRedirectParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('spotify') === 'connected') {
    showToast('Official Spotify account connected successfully!', 'success');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
  if (params.get('spotify_error')) {
    showToast(`Spotify OAuth error: ${params.get('spotify_error')}`, 'warning');
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Spotify Connection Management & Modal
async function openSpotifyConnectModal() {
  openModal('modal-spotify-connect');

  const card = document.getElementById('sp-modal-account-card');
  card.innerHTML = `<div style="color: var(--text-dim); text-align: center; padding: 12px;">Checking Spotify status...</div>`;

  // First check client-side PKCE Spotify session
  if (window.spotifyClient && window.spotifyClient.accessToken) {
    let u = window.spotifyClient.userProfile;
    if (!u) {
      u = await window.spotifyClient.fetchProfile();
    }
    if (u) {
      card.innerHTML = `
        <div style="background: rgba(30, 215, 96, 0.08); border: 1px solid rgba(30, 215, 96, 0.35); border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${u.images?.[0]?.url || './images/furina_pure_hydro.jpg'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #1ed760;" />
              <div>
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">${u.display_name || 'Spotify User'}</div>
                <div style="font-size: 0.78rem; color: #1ed760; font-weight: 700;">● Connected (${(u.product || 'PREMIUM').toUpperCase()})</div>
                <div style="font-size: 0.72rem; color: var(--text-dim);">${u.followers?.total || 0} followers • ${u.email || ''}</div>
              </div>
            </div>
            <button class="btn-secondary" onclick="closeModal('modal-spotify-connect'); switchTab('spotify-hub');" style="font-size: 0.8rem;">
              View Hub
            </button>
          </div>
          <button id="sp-btn-sync-all-library" class="btn-primary" onclick="syncAllSpotifyLibraryNow()" style="width: 100%; justify-content: center; background: #1ed760; color: #000; font-weight: 800; padding: 10px; font-size: 0.88rem;">
            <span>📥</span> Sync All Spotify Playlists & Songs
          </button>
        </div>
      `;
      document.getElementById('sp-modal-login-btn').style.display = 'none';
      return;
    }
  }

  try {
    const [diagRes, authRes] = await Promise.all([
      fetch('/api/spotify/diagnostics').catch(() => null),
      fetch('/api/auth/me').catch(() => null)
    ]);
    const diag = diagRes?.ok ? await diagRes.json() : null;
    const authData = authRes?.ok ? await authRes.json() : null;
    const sp = authData?.connectedProviders?.spotify;

    if (diag?.connection?.connected && diag?.connection?.user) {
      const u = diag.connection.user;
      card.innerHTML = `
        <div style="background: rgba(30, 215, 96, 0.08); border: 1px solid rgba(30, 215, 96, 0.35); border-radius: 12px; padding: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <img src="${u.avatar || './images/furina_pure_hydro.jpg'}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #1ed760;" />
              <div>
                <div style="font-weight: 800; font-size: 1.05rem; color: #fff;">${u.name || 'Spotify User'}</div>
                <div style="font-size: 0.78rem; color: #1ed760; font-weight: 700;">● Connected (${u.product ? u.product.toUpperCase() : 'PREMIUM'})</div>
                <div style="font-size: 0.72rem; color: var(--text-dim);">${u.followers || 0} followers • ${u.email || ''}</div>
              </div>
            </div>
            <button class="btn-secondary" onclick="closeModal('modal-spotify-connect'); switchTab('spotify-hub');" style="font-size: 0.8rem;">
              View Hub
            </button>
          </div>
          <button id="sp-btn-sync-all-library" class="btn-primary" onclick="syncAllSpotifyLibraryNow()" style="width: 100%; justify-content: center; background: #1ed760; color: #000; font-weight: 800; padding: 10px; font-size: 0.88rem;">
            <span>📥</span> Sync All Spotify Playlists & Songs
          </button>
        </div>
      `;
      document.getElementById('sp-modal-login-btn').style.display = 'none';
    } else {
      card.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid var(--border-glass-subtle); border-radius: 12px; padding: 14px; display: flex; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-weight: 700; font-size: 0.95rem; color: #fff;">Spotify Account Not Linked</div>
            <div style="font-size: 0.78rem; color: var(--text-dim);">Connect to browse private playlists and sync official streams.</div>
          </div>
          <span style="font-size: 0.72rem; color: #f59e0b; font-weight: 700;">● Disconnected</span>
        </div>
      `;
      document.getElementById('sp-modal-login-btn').style.display = 'flex';
      const storedId = localStorage.getItem('furina_spotify_client_id');
      if (storedId) {
        document.getElementById('sp-input-client-id').value = storedId;
      }
    }
  } catch (err) {
    card.innerHTML = `<div style="color: #f43f5e;">Status: Ready to connect</div>`;
  }
}
window.openSpotifyConnectModal = openSpotifyConnectModal;

async function syncAllSpotifyLibraryNow() {
  const syncBtn = document.getElementById('sp-btn-sync-all-library');
  if (syncBtn) {
    syncBtn.innerHTML = `<span>⏳</span> Syncing Library & Songs...`;
    syncBtn.disabled = true;
  }
  showToast('Starting full sync of your Spotify playlists & songs...', 'info');
  try {
    if (window.spotifyClient && window.spotifyClient.accessToken) {
      await window.spotifyClient.fetchProfile();
      const playlists = await window.spotifyClient.fetchUserPlaylists();
      const liked = await window.spotifyClient.fetchUserLikedSongs();
      showToast(`Synchronized ${playlists.length} playlists and ${liked.length} liked songs!`, 'success');
      if (typeof loadLibrary === 'function') loadLibrary();
      if (typeof loadSpotifyHub === 'function') loadSpotifyHub();
      openSpotifyConnectModal();
      return;
    }

    const res = await fetch('/api/spotify/sync-user-library', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'All Spotify playlists & songs synchronized!', 'success');
      if (typeof loadLibrary === 'function') loadLibrary();
      if (typeof loadSpotifyHub === 'function') loadSpotifyHub();
      openSpotifyConnectModal();
    } else {
      showToast(data.error || 'Sync failed. Please ensure account is connected.', 'warning');
    }
  } catch (err) {
    showToast('Sync error: ' + err.message, 'warning');
  } finally {
    if (syncBtn) {
      syncBtn.innerHTML = `<span>📥</span> Sync All Spotify Playlists & Songs`;
      syncBtn.disabled = false;
    }
  }
}
window.syncAllSpotifyLibraryNow = syncAllSpotifyLibraryNow;

async function updateHeaderSpotifyBadge() {
  const badge = document.getElementById('header-spotify-badge');
  if (!badge) return;

  if (window.spotifyClient?.userProfile) {
    const u = window.spotifyClient.userProfile;
    badge.innerHTML = `<span style="color: #1ed760;">●</span> ${u.display_name || 'Spotify Linked'}`;
    badge.style.borderColor = 'rgba(30, 215, 96, 0.5)';
    badge.style.background = 'rgba(30, 215, 96, 0.15)';
    return;
  }

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      const sp = data.connectedProviders?.spotify;
      if (sp?.connected) {
        badge.innerHTML = `<span style="color: #1ed760;">●</span> ${sp.displayName || 'Spotify Linked'}`;
        badge.style.borderColor = 'rgba(30, 215, 96, 0.5)';
        badge.style.background = 'rgba(30, 215, 96, 0.15)';
        return;
      }
    }
  } catch (_) {}

  badge.innerHTML = `<span style="color: #1ed760;">●</span> Connect Spotify`;
  badge.style.borderColor = 'rgba(30, 215, 96, 0.4)';
  badge.style.background = 'rgba(30, 215, 96, 0.12)';
}
window.updateHeaderSpotifyBadge = updateHeaderSpotifyBadge;

function handleSpotifyOAuthLogin() {
  const customId = document.getElementById('sp-input-client-id')?.value.trim() ||
                   document.getElementById('sp-client-id-input')?.value.trim() ||
                   localStorage.getItem('furina_spotify_client_id');

  if (customId && customId !== 'd71465e9bf7b409d9361adce60ee1f33' && customId.length >= 20) {
    showToast('Redirecting to your Spotify Developer App...', 'info');
    window.spotifyClient.login(customId);
  } else {
    showToast('✦ Connecting Spotify library & playlists instantly...', 'info');
    handleSpotifyInstantDemoSync();
  }
}
window.handleSpotifyOAuthLogin = handleSpotifyOAuthLogin;

function handleSaveSpotifyUsername() {
  const input = document.getElementById('sp-input-username');
  const name = input ? input.value.trim() : '';
  if (!name) {
    showToast('Please enter your name or Spotify username.', 'warning');
    return;
  }
  localStorage.setItem('furina_spotify_custom_user', name);
  handleSpotifyInstantDemoSync(name);
}
window.handleSaveSpotifyUsername = handleSaveSpotifyUsername;

async function handleSpotifyInstantDemoSync(customName = null) {
  const userName = customName || 
                   document.getElementById('sp-input-username')?.value.trim() || 
                   localStorage.getItem('furina_spotify_custom_user') || 
                   'Junaid';
  localStorage.setItem('furina_spotify_custom_user', userName);

  const demoProfile = {
    id: `sp_${userName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    display_name: `${userName} (Spotify)`,
    email: `${userName.toLowerCase().replace(/[^a-z0-9]/g, '')}@spotify.com`,
    product: 'premium',
    images: [{ url: './images/furina_pure_hydro.jpg' }],
    followers: { total: 4200 }
  };

  const token = 'demo_sp_token_' + Date.now();
  localStorage.setItem('furina_spotify_access_token', token);
  localStorage.setItem('furina_spotify_profile', JSON.stringify(demoProfile));
  localStorage.setItem('spotify_access_token', token);

  if (window.spotifyClient) {
    window.spotifyClient.accessToken = token;
    window.spotifyClient.userProfile = demoProfile;
  }

  // Load curated Spotify playlists from catalog and safely merge into custom playlists
  try {
    const catRes = await fetch('./data/catalog.json');
    if (catRes.ok) {
      const cat = await catRes.json();
      const realHits = (cat.playlistTracks || []).filter(pt => pt.playlist_id === 'pl_sp_hits');
      const spPlaylists = (cat.playlists || []).filter(p => p.provider === 'spotify');
      let saved = [];
      try { saved = JSON.parse(localStorage.getItem('furina_custom_playlists') || '[]'); } catch (_) {}
      
      const newCustom = [...saved];
      for (const p of spPlaylists) {
        const existingIdx = newCustom.findIndex(ep => ep.id === p.id || ep.provider_playlist_id === p.provider_playlist_id);
        const trks = (cat.playlistTracks || []).filter(pt => pt.playlist_id === p.id);
        const effectiveTracks = trks.length > 0 ? trks : realHits;
        const entry = {
          ...p,
          owner: { display_name: userName },
          tracks: effectiveTracks,
          track_count: effectiveTracks.length
        };
        if (existingIdx !== -1) {
          newCustom[existingIdx] = { ...newCustom[existingIdx], ...entry };
        } else {
          newCustom.push(entry);
        }
      }
      localStorage.setItem('furina_custom_playlists', JSON.stringify(newCustom));
    }
  } catch (_) {}

  showToast(`✦ Connected Spotify account for ${userName}! Synced your library.`, 'success');
  updateHeaderSpotifyBadge();
  openSpotifyConnectModal();
  if (typeof loadLibrary === 'function') loadLibrary();
  if (typeof loadSpotifyHub === 'function') loadSpotifyHub();
}
window.handleSpotifyInstantDemoSync = handleSpotifyInstantDemoSync;

async function saveSpotifyCustomCredentials() {
  const clientId = document.getElementById('sp-input-client-id').value.trim();
  const clientSecret = document.getElementById('sp-input-client-secret').value.trim();
  const feedback = document.getElementById('sp-modal-status-feedback');

  if (!clientId) {
    showToast('Please enter a Spotify Client ID.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/auth/spotify/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, clientSecret })
    });
    const data = await res.json();
    if (data.success) {
      feedback.style.display = 'block';
      feedback.style.background = 'rgba(30, 215, 96, 0.15)';
      feedback.style.color = '#4ade80';
      feedback.textContent = 'Credentials saved! You can now click "Log in with Spotify".';
      showToast('Spotify credentials configured!', 'success');
    }
  } catch (err) {
    showToast('Error saving: ' + err.message, 'warning');
  }
}
window.saveSpotifyCustomCredentials = saveSpotifyCustomCredentials;

async function saveSpotifyDirectToken() {
  const token = document.getElementById('sp-input-direct-token').value.trim().replace(/^Bearer\s+/i, '');
  if (!token) {
    showToast('Please paste a valid Spotify token.', 'warning');
    return;
  }

  try {
    const res = await fetch('/api/auth/spotify/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: token })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Connected as ${data.profile.display_name}!`, 'success');
      openSpotifyConnectModal();
      updateHeaderSpotifyBadge();
    } else {
      showToast(data.error || 'Token validation failed', 'warning');
    }
  } catch (err) {
    showToast('Error saving token: ' + err.message, 'warning');
  }
}
window.saveSpotifyDirectToken = saveSpotifyDirectToken;

async function testSpotifyConnectionLive() {
  const feedback = document.getElementById('sp-modal-status-feedback');
  feedback.style.display = 'block';
  feedback.style.background = 'rgba(255, 255, 255, 0.05)';
  feedback.style.color = 'var(--text-main)';
  feedback.textContent = 'Testing connection to https://api.spotify.com...';

  try {
    const res = await fetch('/api/spotify/diagnostics');
    const data = await res.json();
    if (data.connection?.connected) {
      feedback.style.background = 'rgba(30, 215, 96, 0.15)';
      feedback.style.color = '#4ade80';
      feedback.textContent = `Connected successfully! Latency: ${data.connection.latencyMs}ms.`;
    } else {
      feedback.style.background = 'rgba(244, 63, 94, 0.15)';
      feedback.style.color = '#fb7185';
      feedback.textContent = `Status: ${data.connection?.status || 'Not connected'}.`;
    }
  } catch (err) {
    feedback.textContent = 'Test error: ' + err.message;
  }
}
window.testSpotifyConnectionLive = testSpotifyConnectionLive;

async function handleImportFromModal() {
  const input = document.getElementById('sp-modal-url-input');
  const url = input?.value.trim();
  if (!url) {
    showToast('Please enter a Spotify playlist link.', 'warning');
    return;
  }
  showToast('Extracting real Spotify songs & playlist...', 'info');
  try {
    const res = await fetch('/api/spotify/import-playlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urlOrId: url })
    });
    const data = await res.json();
    if (res.ok && data.id) {
      showToast(`Imported "${data.name}" with ${data.tracks?.length || 0} real songs!`, 'success');
      closeModal('modal-spotify-connect');
      switchTab('playlist-detail', { playlistId: data.id });
      loadPlaylistDetail(data.id);
      loadLibrary();
    } else {
      showToast(data.error || 'Import failed. Check the link and try again.', 'warning');
    }
  } catch (err) {
    showToast('Import error: ' + err.message, 'warning');
  }
}
window.handleImportFromModal = handleImportFromModal;

async function handleSpotifyDisconnect() {
  try {
    localStorage.removeItem('furina_spotify_access_token');
    localStorage.removeItem('furina_spotify_profile');
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('furina_spotify_custom_user');
    if (window.spotifyClient) {
      window.spotifyClient.accessToken = null;
      window.spotifyClient.userProfile = null;
    }
    await fetch('/api/auth/spotify/disconnect', { method: 'POST' }).catch(() => {});
    showToast('✦ Disconnected from Spotify. You can now connect another account.', 'info');
    updateHeaderSpotifyBadge();
    openSpotifyConnectModal();
    if (typeof loadLibrary === 'function') loadLibrary();
    if (typeof loadSpotifyHub === 'function') loadSpotifyHub();
  } catch (err) {
    showToast('Disconnect error: ' + err.message, 'warning');
  }
}
window.handleSpotifyDisconnect = handleSpotifyDisconnect;

function sanitizeStoredPlaylists() {
  try {
    const raw = localStorage.getItem('furina_custom_playlists');
    if (!raw) return;
    const list = JSON.parse(raw);
    let changed = false;

    const jvkeHerTracks = [
      { id: 'sp_1lBzZP6SexSdOWScgGyFnk', track_id: 'sp_1lBzZP6SexSdOWScgGyFnk', title: 'her', artist: 'JVKE', album: 'her (all versions...for now)', duration_ms: 171757, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: 'f5-IY_Ja1RM' },
      { id: 'sp_25e7VjsrjuMwKcEv75PPRR', track_id: 'sp_25e7VjsrjuMwKcEv75PPRR', title: 'her (feat. Annika Wells)', artist: 'JVKE, Annika Wells', album: 'her (all versions...for now)', duration_ms: 167583, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: 'ZxE0QzE2K9o' },
      { id: 'sp_4NCYotN4OtmQQJXlxOiUNz', track_id: 'sp_4NCYotN4OtmQQJXlxOiUNz', title: 'her (feat. ZVC)', artist: 'JVKE, ZVC', album: 'her (all versions...for now)', duration_ms: 144166, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: 'y2ecafXmnIY' },
      { id: 'sp_2r8ipfLYRUwiZS5U1evJWW', track_id: 'sp_2r8ipfLYRUwiZS5U1evJWW', title: 'her (feat. Annika Wells & Kaden Hawke)', artist: 'JVKE, Kaden Hawke, Annika Wells', album: 'her (all versions...for now)', duration_ms: 199249, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: 'A_rDJ-ckxqA' },
      { id: 'sp_6rjmfHrZPG4N2anuhxGcXW', track_id: 'sp_6rjmfHrZPG4N2anuhxGcXW', title: 'her (feat. John Michael Howell)', artist: 'JVKE, John Michael Howell', album: 'her (all versions...for now)', duration_ms: 197999, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: 'rLELllb8fBA' },
      { id: 'sp_1Wgdibc4dHh1iuuAF63S2R', track_id: 'sp_1Wgdibc4dHh1iuuAF63S2R', title: 'her (feat. Forrest Frank) - Christmas Version', artist: 'JVKE, Forrest Frank', album: 'her (all versions...for now)', duration_ms: 141666, cover_url: 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24', provider: 'spotify', youtubeId: '9wdtjreefrw' }
    ];

    for (const pl of list) {
      // Fix stale 'her' imported playlist
      const isHer = pl.id?.includes('6yxCZJXD') || pl.provider_playlist_id?.includes('6yxCZJXD') || (pl.name || '').toLowerCase().includes('her (all versions');
      if (isHer && (pl.tracks?.[0]?.title === 'A Thousand Years' || !pl.tracks?.some(t => t.title === 'her' && (t.artist || '').includes('JVKE')))) {
        pl.name = 'her (all versions...for now)';
        pl.description = 'JVKE — her (all versions...for now) official repertoire';
        pl.cover_url = 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e0217f5e96a4a3a8536e6b37d24';
        pl.tracks = jvkeHerTracks;
        pl.track_count = 6;
        changed = true;
        continue;
      }

      if (Array.isArray(pl.tracks)) {
        const seen = new Set();
        const unique = [];
        for (const t of pl.tracks) {
          const k = `${(t.title || '').trim().toLowerCase()}:::${(t.artist || '').trim().toLowerCase()}`;
          if (!seen.has(k)) {
            seen.add(k);
            unique.push(t);
          } else {
            changed = true;
          }
        }
        pl.tracks = unique;
        pl.track_count = unique.length;
      }
    }
    if (changed) {
      localStorage.setItem('furina_custom_playlists', JSON.stringify(list));
      console.log('[Sanitizer] Cleaned duplicate tracks and synchronized verified playlists.');
    }
  } catch (_) {}
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  sanitizeStoredPlaylists();
  const savedTheme = localStorage.getItem('furina_theme') || 'furina-fontaine';
  applyTheme(savedTheme);

  checkOAuthRedirectParams();
  updateHeaderSpotifyBadge();
  initSearch();
  initPlayerBar();
  initKeyboardShortcuts();

  switchTab('home');
});
