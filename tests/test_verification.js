const fs = require('fs');

// Read audio-player.js content
const audioPlayerCode = fs.readFileSync('public/js/audio-player.js', 'utf8');

// Mock DOM environment before evaluation
global.document = {
  getElementById: () => null,
  querySelector: () => null,
  createElement: () => ({ style: {} }),
  body: { appendChild: () => {} },
  head: { appendChild: () => {} }
};
global.window = {};
global.navigator = { mediaSession: { setActionHandler: () => {} } };

const sandbox = {
  window: global.window,
  Audio: class { setAttribute(){} load(){} play(){ return Promise.resolve(); } pause(){} addEventListener(){} }
};
const evalFn = new Function('window', 'Audio', 'document', 'navigator', audioPlayerCode + '; return { FurinaAudioEngine, FURINA_CANONICAL_VIDEOS: window.__FURINA_CANONICAL_VIDEOS__ };');
const { FurinaAudioEngine, FURINA_CANONICAL_VIDEOS } = evalFn(sandbox.window, sandbox.Audio, global.document, global.navigator);

console.log('--- TEST 1: Canonical Database Integrity ---');
console.log('Total Canonical Mappings:', Object.keys(FURINA_CANONICAL_VIDEOS).length);
console.log('Lover:', FURINA_CANONICAL_VIDEOS['lover']);
console.log('Tum Jo Aaye:', FURINA_CANONICAL_VIDEOS['tum jo aaye']);
console.log('Cruel Summer:', FURINA_CANONICAL_VIDEOS['cruel summer']);
console.log('Espresso:', FURINA_CANONICAL_VIDEOS['espresso']);

console.log('\n--- TEST 2: resolveTrackVideoId Integrity ---');
// Mock DOM document for initYouTubeStreamer
global.document = {
  getElementById: () => null,
  createElement: () => ({ style: {} }),
  body: { appendChild: () => {} }
};
global.window = sandbox.window;
global.navigator = { mediaSession: { setActionHandler: () => {} } };

const player = new FurinaAudioEngine();

const testCases = [
  { title: 'Lover', artist: 'Taylor Swift', expected: '-BjZmE2gtdo' },
  { title: 'Lover', artist: '', expected: '-BjZmE2gtdo' },
  { title: 'lover', artist: 'Laufey', expected: 'q3BEA3ew77Y' },
  { title: 'Tum Jo Aaye (Lo-Fi)', artist: 'Rahat Fateh Ali Khan', expected: 'g0sR_L4W72Q' },
  { title: 'tum jo aaye', artist: '', expected: 'g0sR_L4W72Q' },
  { title: 'Lust', artist: 'Marino', expected: 'sr_qh33LsKQ' },
  { title: 'Greed', artist: 'Marino', expected: 'Af9nqVCKb-o' },
  { title: 'Cruel Summer', artist: 'Taylor Swift', expected: 'ic8j13piLus' },
  { title: 'Anti-Hero', artist: 'Taylor Swift', expected: 'b1kbLwvqugk' },
  { title: 'Blank Space', artist: 'Taylor Swift', expected: 'e-ORhEE9VVg' },
  { title: 'Style', artist: 'Taylor Swift', expected: '-CmadmM5cOk' },
  { title: 'Cardigan', artist: 'Taylor Swift', expected: 'K-a8s8OLBSE' },
  { title: 'Espresso', artist: 'Sabrina Carpenter', expected: 'eVli-tstM5E' },
  { title: 'Birds of a Feather', artist: 'Billie Eilish', expected: 'd5gf9dXbPi0' },
  { title: 'Golden Hour', artist: 'JVKE', expected: 'UsR08cY8k0A' },
  { title: 'Die With A Smile', artist: 'Lady Gaga & Bruno Mars', expected: 'kPa7bsKwL-c' },
  { title: 'Beautiful Things', artist: 'Benson Boone', expected: 'Oa_RSwwpPaA' },
  { title: 'Starboy', artist: 'The Weeknd', expected: '34Na4j8AVgA' },
  { title: 'Rockstar', artist: 'Post Malone', expected: 'UceaB4D0jpo' }
];

let allPassed = true;
for (const tc of testCases) {
  const resolved = player.resolveTrackVideoId(tc);
  const pass = resolved === tc.expected;
  if (!pass) allPassed = false;
  console.log(`${pass ? '✅ PASS' : '❌ FAIL'}: "${tc.title}" by "${tc.artist}" => got: ${resolved} (expected: ${tc.expected})`);
}

console.log('\n--- VERIFICATION RESULT ---');
console.log(allPassed ? '🎉 ALL 19 TRACK RESOLUTION TESTS PASSED 100%!' : '⚠️ SOME TESTS FAILED');
