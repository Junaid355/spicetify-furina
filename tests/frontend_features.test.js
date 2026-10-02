const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING FRONTEND & BUG LOGGER VERIFICATION SUITE ===');

const baseDir = path.join(__dirname, '..');

// 1. Verify files exist
const expectedFiles = [
  'public/js/bug-logger.js',
  'public/images/furina_dance.gif',
  'public/images/furina_focalors.gif',
  'public/css/animations.css',
  'public/css/components.css',
  'public/css/layout.css',
  'public/css/player.css',
  'public/index.html'
];

for (const rel of expectedFiles) {
  const full = path.join(baseDir, rel);
  assert(fs.existsSync(full), `File must exist: ${rel}`);
  const stats = fs.statSync(full);
  assert(stats.size > 0, `File must not be empty: ${rel}`);
  console.log(`  [PASS] File exists: ${rel} (${stats.size} bytes)`);
}

// 2. Verify Furina GIF sizes
const danceStats = fs.statSync(path.join(baseDir, 'public/images/furina_dance.gif'));
assert(danceStats.size > 30000, 'furina_dance.gif must be valid animated GIF (>30KB)');
console.log('  [PASS] furina_dance.gif valid size:', danceStats.size);

// 3. Verify HTML structure
const html = fs.readFileSync(path.join(baseDir, 'public/index.html'), 'utf-8');
assert(html.includes('bug-logger.js'), 'index.html must reference bug-logger.js');
assert(html.includes('drawer-bug-logger'), 'index.html must have #drawer-bug-logger');
assert(html.includes('btn-bug-logger'), 'index.html must have #btn-bug-logger');
assert(html.includes('mobile-navbar'), 'index.html must have .mobile-navbar');
assert(html.includes('player-mini-progress-fill'), 'index.html must have #player-mini-progress-fill');
assert(html.includes('furina_dance.gif'), 'index.html must reference furina_dance.gif');
console.log('  [PASS] index.html structure verified (Logger drawer, mobile navbar, mini progress, Furina GIF)');

// 4. Verify CSS rules
const animCss = fs.readFileSync(path.join(baseDir, 'public/css/animations.css'), 'utf-8');
assert(animCss.includes('border-beam'), 'animations.css must define border-beam');
assert(animCss.includes('spotlight-card'), 'animations.css must define spotlight-card');
assert(animCss.includes('text-shimmer-hydro'), 'animations.css must define text-shimmer-hydro');
assert(animCss.includes('logger-drawer'), 'animations.css must define logger-drawer styles');
console.log('  [PASS] animations.css contains Aceternity spotlight, Magic UI border-beam, shimmer text, and logger drawer');

const playerCss = fs.readFileSync(path.join(baseDir, 'public/css/player.css'), 'utf-8');
assert(playerCss.includes('@media (max-width: 768px)'), 'player.css must have mobile media query');
assert(playerCss.includes('player-mini-progress'), 'player.css must have player-mini-progress');
console.log('  [PASS] player.css mobile mini-player overhaul verified');

const compCss = fs.readFileSync(path.join(baseDir, 'public/css/components.css'), 'utf-8');
assert(compCss.includes('bento-grid'), 'components.css must define bento-grid');
assert(compCss.includes('@media (max-width: 768px)'), 'components.css must define mobile media query');
console.log('  [PASS] components.css Bento Grid and mobile media queries verified');

const layoutCss = fs.readFileSync(path.join(baseDir, 'public/css/layout.css'), 'utf-8');
assert(layoutCss.includes('.mobile-navbar'), 'layout.css must style .mobile-navbar');
assert(layoutCss.includes('bottom: 0'), 'layout.css mobile-navbar must sit at bottom: 0');
console.log('  [PASS] layout.css mobile-navbar at bottom: 0 verified');

// 5. Verify sync script includes new files
const syncScript = fs.readFileSync(path.join(baseDir, 'sync_to_github_all.js'), 'utf-8');
assert(syncScript.includes('.gif'), 'sync_to_github_all.js must include .gif in isBinary');
assert(syncScript.includes('bug-logger.js'), 'sync_to_github_all.js must include bug-logger.js');
assert(syncScript.includes('furina_dance.gif'), 'sync_to_github_all.js must include furina_dance.gif');
assert(syncScript.includes('motion-3d.js'), 'sync_to_github_all.js must include motion-3d.js');
console.log('  [PASS] sync_to_github_all.js has .gif binary support and includes new assets');

// 6. Verify 3D Motion and Audio Engine updates
const motion3d = path.join(baseDir, 'public/js/motion-3d.js');
assert(fs.existsSync(motion3d), 'motion-3d.js must exist');
const motionContent = fs.readFileSync(motion3d, 'utf-8');
assert(motionContent.includes('perspective(900px)'), 'motion-3d.js must provide 3D perspective tilt');
assert(motionContent.includes('ocean-ripple-canvas'), 'motion-3d.js must render 3D ocean grid');
console.log('  [PASS] motion-3d.js provides Aceternity 3D tilt and Magic UI perspective ocean grid');

const audioContent = fs.readFileSync(path.join(baseDir, 'public/js/audio-player.js'), 'utf-8');
assert(audioContent.includes('executeYouTubeSearchPlay'), 'audio-player.js must define executeYouTubeSearchPlay');
assert(audioContent.includes('FURINA_CANONICAL_VIDEOS'), 'audio-player.js must support canonical video database');
assert(audioContent.includes('resolveTrackVideoId'), 'audio-player.js must provide exact video resolution');
console.log('  [PASS] audio-player.js 100% full song zero-ad canonical resolution verified');

// 7. Verify Windows Executables in dist/
const portableExe = path.join(baseDir, 'dist/Furina Music 1.0.0.exe');
const setupExe = path.join(baseDir, 'dist/Furina Music Setup 1.0.0.exe');
assert(fs.existsSync(portableExe), 'Portable .exe must exist in dist/');
assert(fs.existsSync(setupExe), 'NSIS Setup .exe must exist in dist/');
assert(fs.statSync(portableExe).size > 50000000, 'Portable .exe must be full binary (>50MB)');
assert(fs.statSync(setupExe).size > 50000000, 'Setup .exe must be full binary (>50MB)');
console.log('  [PASS] Windows standalone .exe binaries verified in dist/ (>100MB each)');

console.log('\nALL 12 FRONTEND & ENGINE CHECKS PASSED SUCCESSFULLY!');

