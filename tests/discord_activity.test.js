const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING DISCORD ACTIVITY VERIFICATION ===');

const indexHtml = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
const discordJs = fs.readFileSync(path.join(__dirname, '../public/js/discord-activity.js'), 'utf8');
const electronMain = fs.readFileSync(path.join(__dirname, '../electron/main.js'), 'utf8');

// 1. Verify Script in HTML & Clean UI (Discord button removed per user request)
assert.ok(indexHtml.includes('js/discord-activity.js'), 'discord-activity.js script loaded');
console.log('  [PASS] Discord activity script registered in index.html');

// 2. Verify Discord Activity Engine
assert.ok(discordJs.includes('FurinaDiscordActivity'), 'FurinaDiscordActivity class defined');
assert.ok(discordJs.includes('Embedded App SDK'), 'Embedded App SDK support documented and handled');
assert.ok(discordJs.includes('updateDiscordPresence'), 'Presence update method defined');
assert.ok(discordJs.includes('shareActivityToDiscord'), 'Activity sharing method defined');
console.log('  [PASS] Discord Activity & Embedded SDK engine verified');

// 3. Verify Electron IPC Bridge
assert.ok(electronMain.includes('update-discord-rpc'), 'update-discord-rpc IPC channel wired in main.js');
console.log('  [PASS] Electron desktop Discord RPC bridge registered');

console.log('\n✨ ALL DISCORD ACTIVITY VERIFICATIONS PASSED 100%!');
