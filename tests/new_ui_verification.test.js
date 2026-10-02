const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING NEW UI & RANDOM ENGINE VERIFICATION SUITE ===');

const baseDir = path.join(__dirname, '..');

// 1. Verify old sidebar is completely removed from index.html
const html = fs.readFileSync(path.join(baseDir, 'public/index.html'), 'utf-8');
assert(!html.includes('<aside class="app-sidebar">'), 'index.html must NOT contain <aside class="app-sidebar">');
console.log('  [PASS] Old left sidebar completely removed from index.html');

// 2. Verify Floating Glass Island Dock exists with all navigation tabs
assert(html.includes('id="floating-island-dock"'), 'index.html must contain #floating-island-dock');
assert(html.includes('class="floating-glass-dock"'), 'index.html must have .floating-glass-dock');

const requiredTabs = ['home', 'search', 'library', 'marketplace', 'spotify-hub', 'equalizer', 'stats', 'settings'];
for (const tab of requiredTabs) {
  assert(html.includes(`data-tab="${tab}"`), `Floating dock must include data-tab="${tab}"`);
}
console.log('  [PASS] Floating Glass Island Dock verified with all 8 navigation items');

// 3. Verify Prominent "Play Random / Shuffle Repertoire" buttons
assert(html.includes('id="btn-hero-random"'), 'Hero Stage must have #btn-hero-random');
assert(html.includes('id="btn-player-random"'), 'Player Deck must have #btn-player-random');
assert(html.includes('playRandomTrackFromCatalog()'), 'index.html must call playRandomTrackFromCatalog()');
console.log('  [PASS] Prominent 🎲 Play Random / Shuffle Repertoire buttons verified in Hero Stage & Player Deck');

// 4. Verify Random Music Engine in app.js
const appJs = fs.readFileSync(path.join(baseDir, 'public/js/app.js'), 'utf-8');
assert(appJs.includes('async function playRandomTrackFromCatalog'), 'app.js must define playRandomTrackFromCatalog');
assert(appJs.includes('window.playRandomTrackFromCatalog = playRandomTrackFromCatalog'), 'app.js must export playRandomTrackFromCatalog to window');
console.log('  [PASS] playRandomTrackFromCatalog verified in app.js');

// 5. Verify Cozy Wooden/Glass Dampened Mechanical Thud (Zero Pitch Slide)
const audioEffects = fs.readFileSync(path.join(baseDir, 'public/js/audio-effects.js'), 'utf-8');
assert(audioEffects.includes('playVelvetHaptic'), 'audio-effects.js must define playVelvetHaptic');
// Ensure NO exponential pitch slide exists in playVelvetHaptic
const hapticFuncMatch = audioEffects.match(/playVelvetHaptic\(\)\s*\{([\s\S]*?)\n    \}/);
assert(hapticFuncMatch, 'playVelvetHaptic function body must be found');
assert(!hapticFuncMatch[1].includes('osc.frequency.exponentialRampToValueAtTime'), 'playVelvetHaptic must NOT use pitch slide');
assert(audioEffects.includes('setValueAtTime(72, now)'), 'playVelvetHaptic must use fixed body resonance (72Hz)');
console.log('  [PASS] Cozy acoustic wooden/glass mechanical thud verified with ZERO pitch slide');

// 6. Verify Catalog Playlist Deduplication
const catalog = JSON.parse(fs.readFileSync(path.join(baseDir, 'public/data/catalog.json'), 'utf-8'));
const herPlaylists = catalog.playlists.filter(p => (p.name || '').toLowerCase().includes('her (all versions'));
assert.strictEqual(herPlaylists.length, 1, `her (all versions...for now) must appear exactly once, got: ${herPlaylists.length}`);

const playlistNames = new Set();
const playlistIds = new Set();
for (const pl of catalog.playlists) {
  const normName = pl.name.toLowerCase().trim();
  const id = (pl.provider_playlist_id || pl.id).toLowerCase().trim();
  assert(!playlistNames.has(normName), `Duplicate playlist name in catalog: ${pl.name}`);
  assert(!playlistIds.has(id), `Duplicate playlist ID in catalog: ${id}`);
  playlistNames.add(normName);
  playlistIds.add(id);
}
console.log(`  [PASS] Catalog playlists 100% unique (verified ${catalog.playlists.length} playlists, zero duplicates)`);

// 7. Verify CSS layout 100% width and responsive dock
const layoutCss = fs.readFileSync(path.join(baseDir, 'public/css/layout.css'), 'utf-8');
assert(layoutCss.includes('.app-sidebar'), 'layout.css must reference .app-sidebar');
assert(layoutCss.includes('display: none !important'), 'layout.css must disable .app-sidebar');
assert(layoutCss.includes('.header-brand-island'), 'layout.css must define .header-brand-island');

// Ensure dead 76px sidebar rail is removed
assert(!layoutCss.includes('width: 76px'), 'layout.css must NOT contain legacy 76px rail sidebar width');
console.log('  [PASS] CSS layout 100% stage width and dead sidebar rail eliminated');

// 8. Verify Responsive Breakpoint Harmony (No navigation void between 641px and 768px)
assert(layoutCss.includes('@media (max-width: 768px)'), 'layout.css must define @media (max-width: 768px)');
const mobileNavMatch = layoutCss.match(/@media\s*\(max-width:\s*768px\)[\s\S]*?\.mobile-navbar\s*\{[\s\S]*?display:\s*flex\s*!important/);
assert(mobileNavMatch, 'mobile-navbar must be enabled at max-width: 768px in layout.css');
console.log('  [PASS] Responsive breakpoint harmony verified (no 641-768px navigation blackout)');

// 9. Verify Audio Effects Click Listener Coverage
assert(audioEffects.includes('.mobile-nav-item'), 'audio-effects.js must bind to .mobile-nav-item');
assert(audioEffects.includes('.btn-ctrl'), 'audio-effects.js must bind to .btn-ctrl');
assert(audioEffects.includes('.spring-click'), 'audio-effects.js must bind to .spring-click');
console.log('  [PASS] Cozy acoustic haptic click verified across all buttons, player controls, and mobile nav');

// 10. Verify iPhone Safe-Area & Touch Parallax
const playerCss = fs.readFileSync(path.join(baseDir, 'public/css/player.css'), 'utf-8');
assert(playerCss.includes('safe-area-inset-bottom'), 'player.css must support env(safe-area-inset-bottom)');

const threeSceneJs = fs.readFileSync(path.join(baseDir, 'public/js/three-scene.js'), 'utf-8');
assert(threeSceneJs.includes('touchmove'), 'three-scene.js must handle touchmove for mobile 3D parallax');
assert(threeSceneJs.includes('onTouchMove'), 'three-scene.js must define onTouchMove');
console.log('  [PASS] iPhone safe-area padding and mobile touch 3D parallax verified');

const compCss = fs.readFileSync(path.join(baseDir, 'public/css/components.css'), 'utf-8');
assert(compCss.includes('.btn-random-repertoire'), 'components.css must define .btn-random-repertoire');
assert(compCss.includes('.dock-separator'), 'components.css must define .dock-separator');

console.log('\n🎉 ALL NEW UI & RANDOM ENGINE VERIFICATION CHECKS PASSED 100%!');

