import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { SpotifyAPI } from '../lib/spotify';
import type { Env } from '../index';

const authRouter = new Hono<{ Bindings: Env }>();

authRouter.get('/spotify/authorize', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const redirectUri = `${c.env.API_BASE_URL}/api/auth/spotify/callback`;
    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET, redirectUri);
    
    // Use userId as state for security
    const authUrl = spotify.getAuthUrl(userId);
    
    return c.json({ auth_url: authUrl });
  } catch (error) {
    console.error('Spotify auth error:', error);
    return c.json({ error: 'Failed to generate auth URL' }, 500);
  }
});

authRouter.get('/spotify/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state'); // This should be the userId
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: 'Spotify authorization failed', details: error }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'Missing code or state parameter' }, 400);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const redirectUri = `${c.env.API_BASE_URL}/api/auth/spotify/callback`;
    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET, redirectUri);

    // Exchange code for tokens
    const tokenResponse = await spotify.exchangeCodeForToken(code);
    
    // Get user profile from Spotify
    const userProfile = await spotify.getUserProfile(tokenResponse.access_token);

    // Update user profile with Spotify information
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        spotify_id: userProfile.id,
        spotify_access_token: tokenResponse.access_token,
        spotify_refresh_token: tokenResponse.refresh_token,
        spotify_token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', state);

    if (updateError) {
      console.error('Profile update error:', updateError);
      return c.json({ error: 'Failed to update profile with Spotify info' }, 500);
    }

    // Redirect to a success page or return success response
    return c.redirect(`${c.env.CLIENT_URL}/settings?spotify=connected`);
  } catch (error) {
    console.error('Spotify callback error:', error);
    return c.json({ error: 'Failed to process Spotify authorization' }, 500);
  }
});

authRouter.post('/spotify/refresh', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user's current Spotify tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_refresh_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.spotify_refresh_token) {
      return c.json({ error: 'No Spotify refresh token found' }, 404);
    }

    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET);
    const tokenResponse = await spotify.refreshAccessToken(profile.spotify_refresh_token);

    // Update tokens in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        spotify_access_token: tokenResponse.access_token,
        spotify_token_expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Token update error:', updateError);
      return c.json({ error: 'Failed to update tokens' }, 500);
    }

    return c.json({ message: 'Tokens refreshed successfully' });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({ error: 'Failed to refresh tokens' }, 500);
  }
});

authRouter.delete('/spotify/disconnect', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supabase
      .from('profiles')
      .update({
        spotify_id: null,
        spotify_access_token: null,
        spotify_refresh_token: null,
        spotify_token_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Disconnect error:', error);
      return c.json({ error: 'Failed to disconnect Spotify' }, 500);
    }

    return c.json({ message: 'Spotify disconnected successfully' });
  } catch (error) {
    console.error('Spotify disconnect error:', error);
    return c.json({ error: 'Failed to disconnect Spotify' }, 500);
  }
});

export default authRouter;