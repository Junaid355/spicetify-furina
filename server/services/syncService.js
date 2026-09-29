const db = require('../db/database');
const spotifyProvider = require('../providers/SpotifyProvider');
const furinaProvider = require('../providers/FurinaCatalogProvider');

class SyncService {
  /**
   * Import Spotify playlist into Furina native playlist
   * Steps 1-12 of Master Prompt Specification
   */
  async importSpotifyPlaylist(userId, spotifyPlaylistId, accessToken = null) {
    // 1 & 2: Read playlist metadata and tracks
    const spPlaylist = await spotifyProvider.getPlaylist(spotifyPlaylistId, accessToken);
    if (!spPlaylist) {
      throw new Error(`Playlist ${spotifyPlaylistId} could not be retrieved from Spotify.`);
    }

    // 8: Avoid creating duplicate playlists if already imported
    const existingPlaylist = await db.queryGet(`
      SELECT * FROM playlists 
      WHERE user_id = ? AND provider = 'spotify' AND provider_playlist_id = ?
    `, [userId, spotifyPlaylistId]);

    const playlistId = existingPlaylist ? existingPlaylist.id : `pl_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    if (!existingPlaylist) {
      // 3, 9, 10, 11: Create Furina playlist preserving name, description, artwork
      await db.queryRun(`
        INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, provider, provider_playlist_id, is_imported, sync_enabled, last_synced_at, sync_status)
        VALUES (?, ?, ?, ?, ?, 1, 'spotify', ?, 1, 1, CURRENT_TIMESTAMP, 'synced')
      `, [
        playlistId,
        userId,
        spPlaylist.name,
        spPlaylist.description || 'Imported from Spotify to Furina Music',
        spPlaylist.coverUrl || '/images/default_artwork.jpg',
        spotifyPlaylistId
      ]);
    } else {
      // Update existing imported playlist header
      await db.queryRun(`
        UPDATE playlists 
        SET name = ?, description = ?, cover_url = ?, last_synced_at = CURRENT_TIMESTAMP, sync_status = 'synced'
        WHERE id = ?
      `, [spPlaylist.name, spPlaylist.description, spPlaylist.coverUrl, playlistId]);
    }

    // Process tracks: matching and preservation of exact order
    const importedTracks = [];
    let position = 0;

    for (const track of spPlaylist.tracks) {
      let resolvedTrackId = null;
      const trackProviderId = track.providerTrackId || track.id || `sp_track_${position}`;

      // 5: Attempt to match tracks against Furina's authorized catalog
      const matchedFurinaTrack = await this.fuzzyMatchFurinaCatalog(track.title, track.artist);

      if (matchedFurinaTrack) {
        // Matched against Furina authorized catalog - gives user lossless local stream!
        resolvedTrackId = matchedFurinaTrack.id;
        
        // Link in provider_tracks
        await db.queryRun(`
          INSERT INTO provider_tracks (id, track_id, provider, provider_track_id, is_matched, raw_metadata)
          VALUES (?, ?, 'spotify', ?, 1, ?)
          ON CONFLICT(provider, provider_track_id) DO UPDATE SET track_id = excluded.track_id, is_matched = 1
        `, [`pt_${trackProviderId}`, resolvedTrackId, trackProviderId, JSON.stringify(track)]);
      } else {
        const trackProviderId = track.providerTrackId || track.id || `sp_track_${position}`;
        const existingTrack = await db.queryGet(`
          SELECT id FROM tracks WHERE provider = 'spotify' AND provider_track_id = ?
        `, [trackProviderId]);

        if (existingTrack) {
          resolvedTrackId = existingTrack.id;
        } else {
          // Register new Spotify track entity in tracks table
          resolvedTrackId = `track_sp_${trackProviderId}`;
          await db.queryRun(`
            INSERT INTO tracks (id, title, artist, album, duration_ms, cover_url, stream_url, provider, provider_track_id, playback_type, is_downloadable, codec, bitrate, sample_rate, lyrics_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'spotify', ?, 'spotify', 0, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title
          `, [
            resolvedTrackId,
            track.title || 'Untitled Track',
            track.artist || 'Unknown Artist',
            track.album || 'Spotify Album',
            track.durationMs || 180000,
            track.coverUrl || '/images/default_artwork.jpg',
            track.streamUrl || null,
            trackProviderId,
            track.audioQuality?.codec || track.audioQuality?.format || 'OGG Vorbis',
            track.audioQuality?.bitrate || '320 kbps',
            track.audioQuality?.sampleRate || '44.1 kHz'
          ]);

          await db.queryRun(`
            INSERT INTO provider_tracks (id, track_id, provider, provider_track_id, is_matched, raw_metadata)
            VALUES (?, ?, 'spotify', ?, 0, ?)
            ON CONFLICT(provider, provider_track_id) DO NOTHING
          `, [`pt_${trackProviderId}`, resolvedTrackId, trackProviderId, JSON.stringify(track)]);
        }
      }

      // 8: Insert into playlist_tracks preserving exact position
      await db.queryRun(`
        INSERT INTO playlist_tracks (id, playlist_id, track_id, position)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(playlist_id, track_id) DO UPDATE SET position = excluded.position
      `, [`${playlistId}_${resolvedTrackId}`, playlistId, resolvedTrackId, position]);

      position++;
      importedTracks.push({
        trackId: resolvedTrackId,
        title: track.title,
        matchedFurina: Boolean(matchedFurinaTrack)
      });
    }

    // Record sync job
    await db.queryRun(`
      INSERT INTO sync_jobs (id, user_id, playlist_id, direction, status, changes_detected, completed_at)
      VALUES (?, ?, ?, 'spotify_to_furina', 'completed', ?, CURRENT_TIMESTAMP)
    `, [`job_${Date.now()}`, userId, playlistId, importedTracks.length]);

    // Return populated playlist
    return await furinaProvider.getPlaylist(playlistId);
  }

  /**
   * Synchronize an already-imported playlist with Spotify
   */
  async syncPlaylist(userId, playlistId, accessToken = null) {
    const playlist = await db.queryGet(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, [playlistId, userId]);
    if (!playlist) throw new Error('Playlist not found');
    if (!playlist.provider_playlist_id) throw new Error('Not a synchronized playlist');

    // Update status to syncing
    await db.queryRun(`UPDATE playlists SET sync_status = 'syncing' WHERE id = ?`, [playlistId]);

    try {
      const refreshed = await this.importSpotifyPlaylist(userId, playlist.provider_playlist_id, accessToken);
      await db.queryRun(`
        UPDATE playlists 
        SET sync_status = 'synced', last_synced_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [playlistId]);
      return { success: true, playlist: refreshed, syncedAt: new Date().toISOString() };
    } catch (err) {
      await db.queryRun(`
        UPDATE playlists 
        SET sync_status = 'error' 
        WHERE id = ?
      `, [playlistId]);
      throw err;
    }
  }

  /**
   * Fuzzy matches track name and artist against Furina's local catalog
   */
  async fuzzyMatchFurinaCatalog(title, artist) {
    if (!title) return null;
    const cleanTitle = title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
    const rows = await db.queryAll(`SELECT * FROM tracks WHERE provider = 'furina'`);
    
    for (const r of rows) {
      const dbTitle = r.title.toLowerCase().replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      if (cleanTitle.includes(dbTitle) || dbTitle.includes(cleanTitle)) {
        return r;
      }
    }
    return null;
  }
}

module.exports = new SyncService();
