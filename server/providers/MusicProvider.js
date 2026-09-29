/**
 * Universal MusicProvider Interface
 * All music providers (Furina, Spotify, Licensed) inherit from this abstraction.
 */
class MusicProvider {
  constructor(name, code) {
    this.name = name;
    this.code = code;
  }

  async getTrack(trackId) {
    throw new Error('Method getTrack() must be implemented.');
  }

  async search(query, limit = 20) {
    throw new Error('Method search() must be implemented.');
  }

  async getAlbum(albumId) {
    throw new Error('Method getAlbum() must be implemented.');
  }

  async getArtist(artistId) {
    throw new Error('Method getArtist() must be implemented.');
  }

  async getPlaylist(playlistId) {
    throw new Error('Method getPlaylist() must be implemented.');
  }

  canStream(track) {
    return false;
  }

  canDownload(track) {
    return false;
  }

  async getStreamUrl(track) {
    return null;
  }

  async getAudioQuality(track) {
    return {
      codec: 'Unknown',
      bitrate: 'N/A',
      sampleRate: 'N/A',
      source: this.name
    };
  }

  async getLyrics(trackId) {
    return null;
  }
}

module.exports = MusicProvider;
