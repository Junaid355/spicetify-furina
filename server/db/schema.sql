-- FURINA MUSIC SCHEMA (SQLite)
PRAGMA foreign_keys = ON;

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user', -- 'user' | 'admin'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Providers registry
CREATE TABLE IF NOT EXISTS providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL, -- 'furina', 'spotify', 'licensed'
  is_active INTEGER DEFAULT 1,
  supports_streaming INTEGER DEFAULT 1,
  supports_download INTEGER DEFAULT 0,
  supports_lyrics INTEGER DEFAULT 1,
  config_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. Provider Accounts (User OAuth bindings e.g. Spotify)
CREATE TABLE IF NOT EXISTS provider_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL REFERENCES providers(code),
  provider_user_id TEXT,
  display_name TEXT,
  email TEXT,
  product TEXT, -- 'premium' | 'free' | 'open'
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at DATETIME,
  scope TEXT,
  profile_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, provider)
);

-- 5. Artists
CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  provider TEXT NOT NULL DEFAULT 'furina',
  provider_artist_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 6. Albums
CREATE TABLE IF NOT EXISTS albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id TEXT REFERENCES artists(id) ON DELETE SET NULL,
  artist_name TEXT,
  release_date TEXT,
  cover_url TEXT,
  genre TEXT,
  total_tracks INTEGER DEFAULT 0,
  provider TEXT NOT NULL DEFAULT 'furina',
  provider_album_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  duration_ms INTEGER NOT NULL,
  cover_url TEXT,
  stream_url TEXT,
  provider TEXT NOT NULL DEFAULT 'furina', -- 'furina', 'spotify', 'licensed'
  provider_track_id TEXT,
  playback_type TEXT NOT NULL DEFAULT 'furina', -- 'furina', 'spotify', 'preview'
  is_downloadable INTEGER DEFAULT 1, -- 1 for Furina tracks, 0 for Spotify
  codec TEXT DEFAULT 'PCM WAV',
  bitrate TEXT DEFAULT '1411 kbps',
  sample_rate TEXT DEFAULT '44.1 kHz',
  lyrics_available INTEGER DEFAULT 0,
  popularity INTEGER DEFAULT 80,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 8. Provider Tracks (Cross-provider mapping and link references)
CREATE TABLE IF NOT EXISTS provider_tracks (
  id TEXT PRIMARY KEY,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  provider TEXT NOT NULL REFERENCES providers(code),
  provider_track_id TEXT NOT NULL,
  external_url TEXT,
  uri TEXT,
  is_matched INTEGER DEFAULT 0,
  raw_metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_track_id)
);

-- 9. Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public INTEGER DEFAULT 1,
  provider TEXT NOT NULL DEFAULT 'furina', -- 'furina' or 'spotify'
  provider_playlist_id TEXT,
  is_imported INTEGER DEFAULT 0,
  sync_enabled INTEGER DEFAULT 0,
  last_synced_at DATETIME,
  sync_status TEXT DEFAULT 'synced', -- 'synced', 'pending', 'syncing', 'error'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 10. Playlist Tracks (Preserving exact order and provider provenance)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(playlist_id, track_id)
);

-- 11. Likes (Favorite tracks)
CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, track_id)
);

-- 12. History (Listening audit log)
CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration_played_ms INTEGER DEFAULT 0,
  completed INTEGER DEFAULT 1
);

-- 13. Downloads (Offline storage manifest for authorized tracks)
CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  file_path TEXT,
  file_size_bytes INTEGER DEFAULT 0,
  quality TEXT DEFAULT 'High (WAV/FLAC)',
  status TEXT DEFAULT 'completed', -- 'downloading', 'completed', 'paused', 'failed'
  downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, track_id)
);

-- 14. Lyrics (Synced LRC and plain text)
CREATE TABLE IF NOT EXISTS lyrics (
  id TEXT PRIMARY KEY,
  track_id TEXT UNIQUE NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  lrc_text TEXT,
  plain_text TEXT,
  is_synced INTEGER DEFAULT 1,
  source TEXT DEFAULT 'Furina Opera Official Archive',
  license_info TEXT DEFAULT 'Authorized for Furina Music streaming'
);

-- 15. Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  score REAL DEFAULT 0.95,
  reason TEXT,
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 16. Charts
CREATE TABLE IF NOT EXISTS charts (
  id TEXT PRIMARY KEY,
  chart_name TEXT NOT NULL, -- 'Fontaine Top 50', 'Opera Epiclese Hits'
  track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  previous_rank INTEGER,
  region TEXT DEFAULT 'Fontaine',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 17. User Settings
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- 'appearance', 'playback', 'spotify', 'downloads', 'privacy'
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category, key)
);

-- 18. Sync Jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  playlist_id TEXT NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  direction TEXT DEFAULT 'spotify_to_furina', -- 'spotify_to_furina' | 'furina_to_spotify'
  status TEXT DEFAULT 'completed', -- 'pending', 'running', 'completed', 'failed'
  changes_detected INTEGER DEFAULT 0,
  error_message TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- 19. Sync States
CREATE TABLE IF NOT EXISTS sync_states (
  id TEXT PRIMARY KEY,
  playlist_id TEXT UNIQUE NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  provider_snapshot_id TEXT,
  track_count INTEGER DEFAULT 0,
  hash TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 20. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'sync'
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_provider ON tracks(provider);
CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_pos ON playlist_tracks(playlist_id, position);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id, played_at);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
