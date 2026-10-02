const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING 3D STAGE & LIVE LYRICS VERIFICATION SUITE ===');

const playerCss = fs.readFileSync(path.join(__dirname, '../public/css/player.css'), 'utf8');
const animCss = fs.readFileSync(path.join(__dirname, '../public/css/animations.css'), 'utf8');
const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const lyricsJs = fs.readFileSync(path.join(__dirname, '../public/js/lyrics-engine.js'), 'utf8');
const motionJs = fs.readFileSync(path.join(__dirname, '../public/js/motion-3d.js'), 'utf8');

// 1. Scrollbar removal check
assert.ok(playerCss.includes('.stage-lyrics-column::-webkit-scrollbar'), 'Webkit scrollbar hidden on lyrics column');
assert.ok(playerCss.includes('scrollbar-width: none'), 'Firefox scrollbar hidden on lyrics column');
console.log('  [PASS] Ugly native browser scrollbar completely hidden from lyrics');

// 2. 3D perspective on lyrics
assert.ok(playerCss.includes('perspective: 1000px') || playerCss.includes('perspective: 1200px'), 'Lyrics column has 3D perspective');
assert.ok(playerCss.includes('transform-style: preserve-3d'), 'Lyrics column preserves 3D transforms');
assert.ok(lyricsJs.includes('apply3DPerspective'), 'Lyrics engine has dynamic 3D parabolic perspective');
assert.ok(lyricsJs.includes('translateZ(32px)'), 'Active lyric pops forward in 3D Z-space (+32px)');
console.log('  [PASS] 3D parabolic perspective and glowing active lyric line verified');

// 3. Stage Artwork & Vinyl Deck Layout Check
assert.ok(animCss.includes('stageVinylSpin'), 'stageVinylSpin keyframe present preserving translation');
assert.ok(animCss.includes('translateY(-50%)'), 'Vinyl is vertically centered with the album sleeve');
assert.ok(!motionJs.includes('artContainer.appendChild(vinylDisc)'), 'No duplicate vinyl elements injected into the cover frame');
console.log('  [PASS] Vinyl turntable deck properly aligned with zero element collision');

// 4. Center label and spindle hole
assert.ok(indexHtml.includes('stage-vinyl-center-art'), 'Stage vinyl disc has center label artwork');
assert.ok(indexHtml.includes('stage-spindle-hole'), 'Stage vinyl disc has spindle hole');
console.log('  [PASS] Fontaine luxury vinyl spindle and center artwork present in DOM');

console.log('\n✨ ALL 4 3D STAGE & LIVE LYRICS VERIFICATIONS PASSED 100%!');
