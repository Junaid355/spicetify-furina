/**
 * Furina Music — Offline Storage Engine (IndexedDB)
 * Manages authorized track caching, blob storage, and storage quotas.
 * Enforces rule: ONLY Furina authorized tracks can be downloaded.
 */
class FurinaOfflineDB {
  constructor() {
    this.dbName = 'FurinaMusicOfflineDB';
    this.version = 1;
    this.db = null;
    this.initPromise = this.init();
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('tracks')) {
          db.createObjectStore('tracks', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'trackId' });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.error('[IndexedDB] Init failed:', e);
        reject(e);
      };
    });
  }

  /**
   * Download and store authorized track
   */
  async downloadTrack(track, onProgress = null) {
    await this.initPromise;

    // Strict validation
    if (track.provider === 'spotify' || !track.isDownloadable) {
      throw new Error('Offline download is unavailable for this provider.');
    }

    if (onProgress) onProgress(10, 'Connecting to audio stream...');

    const response = await fetch(track.streamUrl);
    if (!response.ok) throw new Error(`Stream download failed: ${response.statusText}`);

    if (onProgress) onProgress(45, 'Buffering lossless stream...');

    const blob = await response.blob();

    if (onProgress) onProgress(85, 'Writing to Fontaine Vault...');

    // Store track metadata and blob
    await this.saveMetadata(track, blob.size);
    await this.saveBlob(track.id, blob);

    // Also notify server backend
    try {
      await fetch('/api/library/downloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: track.id, quality: track.audioQuality?.codec || 'High' })
      });
    } catch (_) {}

    if (onProgress) onProgress(100, 'Download complete!');
    return true;
  }

  saveMetadata(track, sizeBytes) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('tracks', 'readwrite');
      const store = tx.objectStore('tracks');
      store.put({
        ...track,
        fileSizeBytes: sizeBytes,
        downloadedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }

  saveBlob(trackId, blob) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('blobs', 'readwrite');
      const store = tx.objectStore('blobs');
      store.put({ trackId, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e);
    });
  }

  async getTrackBlob(trackId) {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction('blobs', 'readonly');
      const store = tx.objectStore('blobs');
      const req = store.get(trackId);
      req.onsuccess = () => resolve(req.result?.blob || null);
      req.onerror = () => resolve(null);
    });
  }

  async getOfflineTracks() {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction('tracks', 'readonly');
      const store = tx.objectStore('tracks');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async deleteTrack(trackId) {
    await this.initPromise;
    return new Promise((resolve) => {
      const tx = this.db.transaction(['tracks', 'blobs'], 'readwrite');
      tx.objectStore('tracks').delete(trackId);
      tx.objectStore('blobs').delete(trackId);
      tx.oncomplete = async () => {
        try {
          await fetch(`/api/library/downloads/${trackId}`, { method: 'DELETE' });
        } catch (_) {}
        resolve();
      };
    });
  }

  async getStorageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage, quota } = await navigator.storage.estimate();
      return {
        usageBytes: usage || 0,
        quotaBytes: quota || 0,
        usageMb: ((usage || 0) / (1024 * 1024)).toFixed(1),
        quotaMb: ((quota || 0) / (1024 * 1024)).toFixed(1)
      };
    }
    return { usageBytes: 0, quotaBytes: 0, usageMb: '0', quotaMb: 'Unlimited' };
  }
}

window.furinaOfflineDB = new FurinaOfflineDB();
