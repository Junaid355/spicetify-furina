const db = require('../server/db/database');
const syncService = require('../server/services/syncService');
const furinaProvider = require('../server/providers/FurinaCatalogProvider');
const spotifyProvider = require('../server/providers/SpotifyProvider');

async function runTests() {
  console.log('=== FURINA MUSIC AUTOMATED TEST SUITE ===');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Test 1: Database connection & initial seeds
    await db.init();
    const providers = await db.queryAll('SELECT * FROM providers');
    assert(providers.length >= 3, `Providers seeded correctly (count: ${providers.length})`);

    // Test 2: Furina Catalog Tracks
    const tracks = await db.queryAll("SELECT * FROM tracks WHERE provider = 'furina'");
    assert(tracks.length >= 5, `Furina catalog loaded with at least 5 tracks (count: ${tracks.length})`);

    const vaguelette = await furinaProvider.getTrack('furina_vaguelette');
    assert(vaguelette && vaguelette.title === 'La Vaguelette', 'Track "La Vaguelette" retrieved successfully');
    assert(vaguelette.isDownloadable === true, 'Furina track is marked downloadable');
    assert(vaguelette.audioQuality.bitrate === '1411 kbps', 'Lossless WAV audio quality verified');

    // Test 3: Synced Lyrics
    const lyrics = await furinaProvider.getLyrics('furina_vaguelette');
    assert(lyrics && lyrics.is_synced === 1, 'Synced LRC lyrics retrieved for La Vaguelette');
    assert(lyrics.lrc_text.includes('[00:00.00]'), 'LRC timestamp structure verified');

    // Test 4: Spotify Provider Invariants
    const spItems = spotifyProvider.getCuratedSpotifyItems('Bach', 5);
    assert(spItems.tracks.length > 0, 'Spotify curated search returns items');
    const spTrack = spItems.tracks[0];
    assert(spTrack.provider === 'spotify', 'Track provider discriminator is "spotify"');
    assert(spTrack.isDownloadable === false, 'Spotify tracks cannot be downloaded (invariant enforced)');

    // Test 5: Playlist Import ("Import to Furina")
    const importedPlaylist = await syncService.importSpotifyPlaylist('user_furina_default', 'sp_test_playlist_01');
    assert(importedPlaylist && importedPlaylist.name, `Import to Furina created playlist: "${importedPlaylist.name}"`);
    assert(importedPlaylist.tracks.length > 0, `Imported playlist contains ${importedPlaylist.tracks.length} tracks`);

    // Test 6: Duplicate Prevention
    const beforeCount = (await db.queryAll("SELECT * FROM playlists WHERE provider_playlist_id = 'sp_test_playlist_01'")).length;
    await syncService.importSpotifyPlaylist('user_furina_default', 'sp_test_playlist_01');
    const afterCount = (await db.queryAll("SELECT * FROM playlists WHERE provider_playlist_id = 'sp_test_playlist_01'")).length;
    assert(beforeCount === afterCount && beforeCount === 1, 'Duplicate playlist creation prevented');

    // Test 7: Playlist Synchronization
    const syncResult = await syncService.syncPlaylist('user_furina_default', importedPlaylist.id);
    assert(syncResult.success === true, 'Playlist synchronized with timestamp update');

    // Test 8: Likes Toggle
    const likeBefore = await db.queryGet("SELECT * FROM likes WHERE user_id = 'user_furina_default' AND track_id = 'furina_stage_glory'");
    await db.queryRun("INSERT INTO likes (id, user_id, track_id) VALUES ('test_like_1', 'user_furina_default', 'furina_stage_glory')");
    const likeAfter = await db.queryGet("SELECT * FROM likes WHERE user_id = 'user_furina_default' AND track_id = 'furina_stage_glory'");
    assert(!likeBefore && likeAfter, 'Like toggle adds track to library');
    await db.queryRun("DELETE FROM likes WHERE id = 'test_like_1'");

    console.log(`\nTEST SUMMARY: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
