const db = require('../db/database');
const spotifyProvider = require('../providers/SpotifyProvider');
const furinaProvider = require('../providers/FurinaCatalogProvider');
const streamResolver = require('./streamResolver');

class SyncService {
  /**
   * Import Spotify playlist into Furina native playlist
   */
  async importSpotifyPlaylist(userId, spotifyPlaylistId, accessToken = null) {
    const spPlaylist = await spotifyProvider.getPlaylist(spotifyPlaylistId, accessToken);
    if (!spPlaylist) {
      throw new Error(`Playlist ${spotifyPlaylistId} could not be retrieved from Spotify.`);
    }

    const existingPlaylist = await db.queryGet(`
      SELECT * FROM playlists 
      WHERE user_id = ? AND provider = 'spotify' AND provider_playlist_id = ?
    `, [userId, spotifyPlaylistId]);

    const playlistId = existingPlaylist ? existingPlaylist.id : `pl_imp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    if (!existingPlaylist) {
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
      await db.queryRun(`
        UPDATE playlists 
        SET name = ?, description = ?, cover_url = ?, last_synced_at = CURRENT_TIMESTAMP, sync_status = 'synced'
        WHERE id = ?
      `, [spPlaylist.name, spPlaylist.description, spPlaylist.coverUrl, playlistId]);
    }

    const importedTracks = [];
    let position = 0;

    for (const track of spPlaylist.tracks) {
      let resolvedTrackId = null;
      const trackProviderId = track.providerTrackId || track.id || `sp_track_${position}`;

      // 1. Check if matches Furina lossless master catalog
      const matchedFurinaTrack = await this.fuzzyMatchFurinaCatalog(track.title, track.artist);

      if (matchedFurinaTrack) {
        resolvedTrackId = matchedFurinaTrack.id;
        await db.queryRun(`
          INSERT INTO provider_tracks (id, track_id, provider, provider_track_id, is_matched, raw_metadata)
          VALUES (?, ?, 'spotify', ?, 1, ?)
          ON CONFLICT(provider, provider_track_id) DO UPDATE SET track_id = excluded.track_id, is_matched = 1
        `, [`pt_${trackProviderId}`, resolvedTrackId, trackProviderId, JSON.stringify(track)]);
      } else {
        const existingTrack = await db.queryGet(`
          SELECT id, stream_url FROM tracks WHERE provider = 'spotify' AND provider_track_id = ?
        `, [trackProviderId]);

        if (existingTrack) {
          resolvedTrackId = existingTrack.id;
          // If existing track had no stream, attempt resolving
          if (!existingTrack.stream_url) {
            const resolved = await streamResolver.resolveAudioStream(track.title, track.artist);
            if (resolved?.streamUrl) {
              await db.queryRun(`UPDATE tracks SET stream_url = ? WHERE id = ?`, [resolved.streamUrl, resolvedTrackId]);
            }
          }
        } else {
          // Resolve audio stream if preview URL is missing
          let streamUrl = track.streamUrl || null;
          if (!streamUrl) {
            const resolved = await streamResolver.resolveAudioStream(track.title, track.artist);
            if (resolved?.streamUrl) {
              streamUrl = resolved.streamUrl;
            }
          }

          resolvedTrackId = `track_sp_${trackProviderId}`;
          await db.queryRun(`
            INSERT INTO tracks (id, title, artist, album, duration_ms, cover_url, stream_url, provider, provider_track_id, playback_type, is_downloadable, codec, bitrate, sample_rate, lyrics_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'spotify', ?, 'spotify', 0, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET title = excluded.title, stream_url = COALESCE(tracks.stream_url, excluded.stream_url)
          `, [
            resolvedTrackId,
            track.title || 'Untitled Track',
            track.artist || 'Unknown Artist',
            track.album || 'Spotify Album',
            track.durationMs || 180000,
            track.coverUrl || '/images/default_artwork.jpg',
            streamUrl,
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

    await db.queryRun(`
      INSERT INTO sync_jobs (id, user_id, playlist_id, direction, status, changes_detected, completed_at)
      VALUES (?, ?, ?, 'spotify_to_furina', 'completed', ?, CURRENT_TIMESTAMP)
    `, [`job_${Date.now()}`, userId, playlistId, importedTracks.length]);

    return await furinaProvider.getPlaylist(playlistId);
  }

  /**
   * Sync ALL Spotify data for the logged-in user:
   * 1. All user playlists
   * 2. Liked Songs
   * 3. Top played tracks
   */
  async syncAllSpotifyUserData(userId, accessToken) {
    if (!accessToken) {
      throw new Error('Spotify Access Token is required to sync account library.');
    }

    const results = {
      playlistsImported: 0,
      likedSongsCount: 0,
      topTracksCount: 0,
      totalTracksSynced: 0,
      playlists: []
    };

    // 1. Import all user playlists
    try {
      const userPlaylistsRes = await spotifyProvider.getUserPlaylists(accessToken, 50);
      const items = userPlaylistsRes.items || [];
      for (const pl of items) {
        if (!pl || !pl.id) continue;
        try {
          const imported = await this.importSpotifyPlaylist(userId, pl.id, accessToken);
          results.playlistsImported++;
          results.totalTracksSynced += (imported.tracks?.length || 0);
          results.playlists.push({ id: imported.id, name: imported.name, totalTracks: imported.tracks?.length || 0 });
        } catch (err) {
          console.warn(`[SyncService] Could not import playlist ${pl.name}:`, err.message);
        }
      }
    } catch (err) {
      console.warn('[SyncService] Fetching user playlists error:', err.message);
    }

    // 2. Import User Liked Songs (/me/tracks)
    try {
      const likedRes = await spotifyProvider.getUserSavedTracks(accessToken, 50);
      const likedItems = likedRes.items || [];
      if (likedItems.length > 0) {
        const likedPlaylistId = `pl_sp_liked_${userId}`;
        await db.queryRun(`
          INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, provider, provider_playlist_id, is_imported, sync_enabled, last_synced_at, sync_status)
          VALUES (?, ?, 'Spotify Liked Songs', 'All your saved songs directly from Spotify', '/images/furina_ocean_abyss.jpg', 0, 'spotify', 'me_tracks', 1, 1, CURRENT_TIMESTAMP, 'synced')
          ON CONFLICT(id) DO UPDATE SET last_synced_at = CURRENT_TIMESTAMP
        `, [likedPlaylistId, userId]);

        let pos = 0;
        for (const item of likedItems) {
          const track = spotifyProvider.formatSpotifyTrack(item.track);
          if (!track) continue;

          let streamUrl = track.streamUrl;
          if (!streamUrl) {
            const resolved = await streamResolver.resolveAudioStream(track.title, track.artist);
            if (resolved?.streamUrl) streamUrl = resolved.streamUrl;
          }

          const trackId = `track_sp_${track.id}`;
          await db.queryRun(`
            INSERT INTO tracks (id, title, artist, album, duration_ms, cover_url, stream_url, provider, provider_track_id, playback_type, is_downloadable, codec, bitrate, sample_rate, lyrics_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'spotify', ?, 'spotify', 0, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET stream_url = COALESCE(tracks.stream_url, excluded.stream_url)
          `, [
            trackId,
            track.title,
            track.artist,
            track.album,
            track.durationMs,
            track.coverUrl,
            streamUrl,
            track.id,
            track.audioQuality.codec,
            track.audioQuality.bitrate,
            track.audioQuality.sampleRate
          ]);

          await db.queryRun(`
            INSERT INTO playlist_tracks (id, playlist_id, track_id, position)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(playlist_id, track_id) DO UPDATE SET position = excluded.position
          `, [`${likedPlaylistId}_${trackId}`, likedPlaylistId, trackId, pos]);

          // Also record in user_likes
          await db.queryRun(`
            INSERT INTO user_likes (id, user_id, target_type, target_id)
            VALUES (?, ?, 'track', ?)
            ON CONFLICT(user_id, target_type, target_id) DO NOTHING
          `, [`like_${userId}_${trackId}`, userId, trackId]);

          pos++;
        }
        results.likedSongsCount = pos;
        results.totalTracksSynced += pos;
        results.playlists.push({ id: likedPlaylistId, name: 'Spotify Liked Songs', totalTracks: pos });
      }
    } catch (err) {
      console.warn('[SyncService] Fetching liked songs error:', err.message);
    }

    // 3. Import User Top Played Tracks (/me/top/tracks)
    try {
      const topRes = await spotifyProvider.getUserTopTracks(accessToken, 30);
      const topItems = topRes.items || [];
      if (topItems.length > 0) {
        const topPlaylistId = `pl_sp_top_${userId}`;
        await db.queryRun(`
          INSERT INTO playlists (id, user_id, name, description, cover_url, is_public, provider, provider_playlist_id, is_imported, sync_enabled, last_synced_at, sync_status)
          VALUES (?, ?, 'Spotify Top Tracks', 'Your most listened to songs on Spotify', '/images/furina_pure_hydro.jpg', 0, 'spotify', 'me_top_tracks', 1, 1, CURRENT_TIMESTAMP, 'synced')
          ON CONFLICT(id) DO UPDATE SET last_synced_at = CURRENT_TIMESTAMP
        `, [topPlaylistId, userId]);

        let pos = 0;
        for (const spTrack of topItems) {
          const track = spotifyProvider.formatSpotifyTrack(spTrack);
          if (!track) continue;

          let streamUrl = track.streamUrl;
          if (!streamUrl) {
            const resolved = await streamResolver.resolveAudioStream(track.title, track.artist);
            if (resolved?.streamUrl) streamUrl = resolved.streamUrl;
          }

          const trackId = `track_sp_${track.id}`;
          await db.queryRun(`
            INSERT INTO tracks (id, title, artist, album, duration_ms, cover_url, stream_url, provider, provider_track_id, playback_type, is_downloadable, codec, bitrate, sample_rate, lyrics_available)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'spotify', ?, 'spotify', 0, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET stream_url = COALESCE(tracks.stream_url, excluded.stream_url)
          `, [
            trackId,
            track.title,
            track.artist,
            track.album,
            track.durationMs,
            track.coverUrl,
            streamUrl,
            track.id,
            track.audioQuality.codec,
            track.audioQuality.bitrate,
            track.audioQuality.sampleRate
          ]);

          await db.queryRun(`
            INSERT INTO playlist_tracks (id, playlist_id, track_id, position)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(playlist_id, track_id) DO UPDATE SET position = excluded.position
          `, [`${topPlaylistId}_${trackId}`, topPlaylistId, trackId, pos]);

          pos++;
        }
        results.topTracksCount = pos;
        results.totalTracksSynced += pos;
        results.playlists.push({ id: topPlaylistId, name: 'Spotify Top Tracks', totalTracks: pos });
      }
    } catch (err) {
      console.warn('[SyncService] Fetching top tracks error:', err.message);
    }

    return results;
  }

  /**
   * Synchronize an already-imported playlist with Spotify
   */
  async syncPlaylist(userId, playlistId, accessToken = null) {
    const playlist = await db.queryGet(`SELECT * FROM playlists WHERE id = ? AND user_id = ?`, [playlistId, userId]);
    if (!playlist) throw new Error('Playlist not found');
    if (!playlist.provider_playlist_id) throw new Error('Not a synchronized playlist');

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
      await db.queryRun(`UPDATE playlists SET sync_status = 'error' WHERE id = ?`, [playlistId]);
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
