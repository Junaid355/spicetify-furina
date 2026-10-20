/**
 * Furina Music — Repertoire & Track Sorting Engine (Source: rootscripts/riff)
 * High-performance multilingual track sorting across titles, artists, duration, and dates.
 */

const TRACK_SORT_MODES = [
  'default',
  'title-asc',
  'title-desc',
  'artist-asc',
  'duration-asc',
  'duration-desc'
];

function compareText(a, b, key) {
  const av = a && typeof a[key] === 'string' ? a[key].trim() : '';
  const bv = b && typeof b[key] === 'string' ? b[key].trim() : '';
  if (!av && !bv) return 0;
  if (!av) return 1;
  if (!bv) return -1;
  return av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true });
}

function compareNumber(a, b, key) {
  const getVal = (item) => {
    if (!item) return Infinity;
    if (Number.isFinite(item[key]) && item[key] > 0) return item[key];
    if (Number.isFinite(item.durationMs) && item.durationMs > 0) return item.durationMs / 1000;
    if (Number.isFinite(item.duration_ms) && item.duration_ms > 0) return item.duration_ms / 1000;
    return Infinity;
  };
  const av = getVal(a);
  const bv = getVal(b);
  if (av === bv) return 0;
  return av < bv ? -1 : 1;
}

function sortTracks(tracks, mode) {
  const list = Array.isArray(tracks) ? tracks.slice() : [];
  if (!mode || mode === 'default') return list;

  if (mode === 'title-asc') return list.sort((a, b) => compareText(a, b, 'title'));
  if (mode === 'title-desc') return list.sort((a, b) => compareText(b, a, 'title'));
  if (mode === 'artist-asc') return list.sort((a, b) => compareText(a, b, 'artist'));
  if (mode === 'duration-asc') return list.sort((a, b) => compareNumber(a, b, 'duration'));
  if (mode === 'duration-desc') return list.sort((a, b) => compareNumber(b, a, 'duration'));

  return list;
}

window.TRACK_SORT_MODES = TRACK_SORT_MODES;
window.sortTracks = sortTracks;
if (typeof module !== 'undefined') module.exports = { TRACK_SORT_MODES, sortTracks };
