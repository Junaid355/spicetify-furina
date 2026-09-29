const db = require('./database');
const syncService = require('../services/syncService');

async function run() {
  console.log('[Setup] Connecting to database...');
  await db.init();

  const userId = 'user_furina_default';

  // 1. Clean duplicate old test playlists
  console.log('[Setup] Cleaning duplicate test playlists...');
  await db.queryRun(`
    DELETE FROM playlists 
    WHERE user_id = ? AND name = 'Classical & Fontaine Grandeur'
  `, [userId]);

  // 2. Link User's local Spotify account
  console.log('[Setup] Linking local Spotify account for 31p3t4dbi4kakc2p4v7e32ghce7a...');
  await db.queryRun(`
    INSERT INTO provider_accounts (
      id, user_id, provider, provider_user_id, display_name, product, scope, created_at, updated_at
    ) VALUES (
      'pa_spotify_user_default', ?, 'spotify', '31p3t4dbi4kakc2p4v7e32ghce7a', 'Junaid (Spotify Connected)', 'premium', 'user-library-read playlist-read-private playlist-modify-public', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT(user_id, provider) DO UPDATE SET 
      provider_user_id = excluded.provider_user_id,
      display_name = excluded.display_name,
      product = excluded.product,
      updated_at = CURRENT_TIMESTAMP
  `, [userId]);

  // 3. Import the 3 Spotify playlists discovered on this machine
  const playlistIds = [
    { id: '4LyuZHEXNwLdJNsoUVsojM', label: 'My love for music' },
    { id: '4WIrG9mO3CUAXhlhNzdPgP', label: 'gaming' },
    { id: '4ZuR5QBwoux4trsbWtOT4S', label: 'Bang Bang Bang 1 Hour' }
  ];

  for (const pl of playlistIds) {
    try {
      console.log(`[Setup] Importing playlist: ${pl.label} (${pl.id})...`);
      const result = await syncService.importSpotifyPlaylist(userId, pl.id);
      console.log(`[Setup] Imported "${result.name}" with ${result.trackCount} tracks (matched: ${result.matchedCount}).`);
    } catch (err) {
      console.error(`[Setup] Error importing playlist ${pl.id}:`, err.message);
    }
  }

  // 4. Verify all playlists
  const playlists = await db.queryAll(`
    SELECT p.id, p.name, p.provider, COUNT(pt.track_id) as total_tracks
    FROM playlists p
    LEFT JOIN playlist_tracks pt ON pt.playlist_id = p.id
    WHERE p.user_id = ?
    GROUP BY p.id
  `, [userId]);

  console.log('\n[Setup] Current user playlists:');
  console.table(playlists);

  // 5. Check account status
  const account = await db.queryGet(`
    SELECT * FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'
  `, [userId]);
  console.log('[Setup] Spotify Provider Account:', account);

  console.log('\n[Setup] All user playlists and account configured successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('[Setup] Fatal error:', err);
  process.exit(1);
});
