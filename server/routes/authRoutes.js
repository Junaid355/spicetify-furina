const express = require('express');
const router = express.Router();
const db = require('../db/database');
const spotifyProvider = require('../providers/SpotifyProvider');

// Current user profile & Spotify connection state
router.get('/me', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id, username, email, display_name, avatar_url, role FROM users LIMIT 1`);
    const spotifyAccount = await db.queryGet(`
      SELECT provider, provider_user_id, display_name, product, token_expires_at, updated_at 
      FROM provider_accounts 
      WHERE user_id = ? AND provider = 'spotify'
    `, [user.id]);

    const isConnected = Boolean(spotifyAccount);
    const isExpired = spotifyAccount?.token_expires_at ? new Date(spotifyAccount.token_expires_at) < new Date() : false;

    res.json({
      user,
      connectedProviders: {
        spotify: {
          connected: isConnected,
          expired: isExpired,
          displayName: spotifyAccount?.display_name || null,
          product: spotifyAccount?.product || null,
          lastLinked: spotifyAccount?.updated_at || null
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Spotify OAuth Initiation: Redirects browser to Spotify's official login page
router.get('/spotify/login', (req, res) => {
  const state = 'furina_oauth_' + Math.random().toString(36).substring(2, 10);
  const authUrl = spotifyProvider.getAuthorizeUrl(state);
  console.log(`[Spotify OAuth] Redirecting user to Spotify login: ${authUrl}`);
  res.redirect(authUrl);
});

// Spotify OAuth Callback: Exchanges code for tokens and redirects back to app
router.get('/spotify/callback', async (req, res) => {
  const { code, error, state } = req.query;

  if (error) {
    console.warn('[Spotify OAuth] User cancelled or error:', error);
    return res.redirect(`/?spotify_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?spotify_error=no_code_provided');
  }

  try {
    const tokenData = await spotifyProvider.exchangeCode(code);
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // Fetch user profile from Spotify
    const profile = await spotifyProvider.getUserProfile(access_token);
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    await db.queryRun(`
      INSERT INTO provider_accounts (id, user_id, provider, provider_user_id, display_name, email, product, access_token, refresh_token, token_expires_at, scope, profile_json, updated_at)
      VALUES (?, ?, 'spotify', ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, provider_accounts.refresh_token),
        token_expires_at = excluded.token_expires_at,
        display_name = excluded.display_name,
        product = excluded.product,
        profile_json = excluded.profile_json,
        updated_at = CURRENT_TIMESTAMP
    `, [
      `pa_sp_${user.id}`,
      user.id,
      profile?.id || 'spotify_user',
      profile?.display_name || 'Spotify Listener',
      profile?.email || '',
      profile?.product || 'premium',
      access_token,
      refresh_token || null,
      expiresAt,
      scope || '',
      JSON.stringify(profile || {})
    ]);

    console.log(`[Spotify OAuth] Successfully connected Spotify account for: ${profile.display_name}`);
    res.redirect('/?spotify=connected');
  } catch (err) {
    console.error('[Spotify OAuth] Callback error:', err);
    res.redirect(`/?spotify_error=${encodeURIComponent(err.message)}`);
  }
});

// Configure or retrieve Spotify client credentials
router.get('/spotify/config', (req, res) => {
  res.json({
    clientId: spotifyProvider.clientId,
    hasSecret: Boolean(spotifyProvider.clientSecret),
    redirectUri: spotifyProvider.redirectUri,
    authorizeUrl: spotifyProvider.getAuthorizeUrl()
  });
});

router.post('/spotify/config', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  spotifyProvider.setCredentials(clientId, clientSecret, redirectUri);
  res.json({
    success: true,
    message: 'Spotify credentials updated.',
    clientId: spotifyProvider.clientId,
    redirectUri: spotifyProvider.redirectUri
  });
});

// Save direct token (from PKCE or manual token)
router.post('/spotify/token', async (req, res) => {
  try {
    const { accessToken, refreshToken, expiresIn } = req.body;
    if (!accessToken) return res.status(400).json({ error: 'accessToken required' });
    const profile = await spotifyProvider.getUserProfile(accessToken);
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    const expiresAt = new Date(Date.now() + (expiresIn || 3600) * 1000).toISOString();
    await db.queryRun(`
      INSERT INTO provider_accounts (id, user_id, provider, provider_user_id, display_name, email, product, access_token, refresh_token, token_expires_at, scope, profile_json, updated_at)
      VALUES (?, ?, 'spotify', ?, ?, ?, ?, ?, ?, ?, 'user-read-private playlist-read-private user-library-read', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, provider_accounts.refresh_token),
        token_expires_at = excluded.token_expires_at,
        display_name = excluded.display_name,
        product = excluded.product,
        profile_json = excluded.profile_json,
        updated_at = CURRENT_TIMESTAMP
    `, [
      `pa_sp_${user.id}`,
      user.id,
      profile?.id || 'spotify_user',
      profile?.display_name || 'Spotify Listener',
      profile?.email || '',
      profile?.product || 'premium',
      accessToken,
      refreshToken || null,
      expiresAt,
      JSON.stringify(profile || {})
    ]);
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Disconnect Spotify
router.post('/spotify/disconnect', async (req, res) => {
  try {
    const user = await db.queryGet(`SELECT id FROM users LIMIT 1`);
    await db.queryRun(`DELETE FROM provider_accounts WHERE user_id = ? AND provider = 'spotify'`, [user.id]);
    res.json({ success: true, message: 'Spotify account disconnected successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
