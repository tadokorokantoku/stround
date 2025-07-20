import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { SpotifyAPI } from '../lib/spotify';
import type { Env } from '../index';

const musicRouter = new Hono<{ Bindings: Env }>();

musicRouter.get('/search', async (c) => {
  const query = c.req.query('q');
  const limit = parseInt(c.req.query('limit') || '20');

  if (!query) {
    return c.json({ error: 'Query parameter is required' }, 400);
  }

  try {
    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET);
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const tracks = await spotify.searchTracks(query, limit);

    const formattedTracks = await Promise.all(tracks.map(async (track) => {
      // Check if track already exists in cache
      const { data: existingTrack } = await supabase
        .from('music')
        .select('*')
        .eq('spotify_id', track.id)
        .single();

      const trackData = {
        spotify_id: track.id,
        title: track.name,
        artist: track.artists.map(artist => artist.name).join(', '),
        album: track.album.name,
        image_url: track.album.images[0]?.url || null,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify,
        duration_ms: track.duration_ms || null,
      };

      if (!existingTrack) {
        // Cache the track in Supabase
        const { data: cachedTrack, error } = await supabase
          .from('music')
          .insert(trackData)
          .select()
          .single();

        if (!error && cachedTrack) {
          return { ...trackData, id: cachedTrack.id };
        }
      } else {
        return { ...trackData, id: existingTrack.id };
      }

      return trackData;
    }));

    return c.json({ tracks: formattedTracks });
  } catch (error) {
    console.error('Music search error:', error);
    return c.json({ error: 'Failed to search music' }, 500);
  }
});

musicRouter.get('/:spotifyId', async (c) => {
  const spotifyId = c.req.param('spotifyId');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // First try to get from cache
    const { data: cachedMusic } = await supabase
      .from('music')
      .select('*')
      .eq('spotify_id', spotifyId)
      .single();

    if (cachedMusic) {
      return c.json({ music: cachedMusic });
    }

    // If not in cache, fetch from Spotify and cache it
    const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET);
    const track = await spotify.getTrack(spotifyId);

    const trackData = {
      spotify_id: track.id,
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      image_url: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
      duration_ms: track.duration_ms,
    };

    // Cache the track
    const { data: music, error } = await supabase
      .from('music')
      .insert(trackData)
      .select()
      .single();

    if (error) {
      console.error('Cache error:', error);
      // Return the track data even if caching fails
      return c.json({ music: trackData });
    }

    return c.json({ music });
  } catch (error) {
    console.error('Get music error:', error);
    return c.json({ error: 'Music not found' }, 404);
  }
});

musicRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { spotify_id, title, artist, album, image_url, preview_url, external_url, duration_ms } = body;

  if (!spotify_id || !title || !artist || !external_url) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if music already exists
    const { data: existingMusic } = await supabase
      .from('music')
      .select('*')
      .eq('spotify_id', spotify_id)
      .single();

    if (existingMusic) {
      return c.json({ music: existingMusic });
    }

    // Create new music entry
    const { data: music, error } = await supabase
      .from('music')
      .insert({
        spotify_id,
        title,
        artist,
        album,
        image_url,
        preview_url,
        external_url,
        duration_ms,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ music }, 201);
  } catch (error) {
    console.error('Create music error:', error);
    return c.json({ error: 'Failed to create music entry' }, 500);
  }
});

// Playback control endpoints for authenticated users with Spotify premium
musicRouter.post('/play/:spotifyId', async (c) => {
  const userId = c.get('userId');
  const spotifyId = c.req.param('spotifyId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Get user's Spotify access token
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_access_token, spotify_token_expires_at')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.spotify_access_token) {
      return c.json({ error: 'Spotify not connected' }, 404);
    }

    // Check if token is expired
    if (new Date(profile.spotify_token_expires_at) <= new Date()) {
      return c.json({ error: 'Spotify token expired, please refresh' }, 401);
    }

    // Start playback on user's active device
    const response = await fetch('https://api.spotify.com/v1/me/player/play', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${profile.spotify_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uris: [`spotify:track:${spotifyId}`]
      }),
    });

    if (response.status === 204) {
      return c.json({ message: 'Playback started' });
    } else if (response.status === 404) {
      return c.json({ error: 'No active device found' }, 404);
    } else {
      const errorData = await response.json();
      return c.json({ error: 'Playback failed', details: errorData }, response.status);
    }
  } catch (error) {
    console.error('Playback error:', error);
    return c.json({ error: 'Failed to start playback' }, 500);
  }
});

musicRouter.post('/pause', async (c) => {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_access_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.spotify_access_token) {
      return c.json({ error: 'Spotify not connected' }, 404);
    }

    const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${profile.spotify_access_token}`,
      },
    });

    if (response.status === 204) {
      return c.json({ message: 'Playback paused' });
    } else {
      const errorData = await response.json();
      return c.json({ error: 'Pause failed', details: errorData }, response.status);
    }
  } catch (error) {
    console.error('Pause error:', error);
    return c.json({ error: 'Failed to pause playback' }, 500);
  }
});

musicRouter.get('/player/state', async (c) => {
  const userId = c.get('userId');
  
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('spotify_access_token')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.spotify_access_token) {
      return c.json({ error: 'Spotify not connected' }, 404);
    }

    const response = await fetch('https://api.spotify.com/v1/me/player', {
      headers: {
        'Authorization': `Bearer ${profile.spotify_access_token}`,
      },
    });

    if (response.status === 200) {
      const playerState = await response.json();
      return c.json({ player: playerState });
    } else if (response.status === 204) {
      return c.json({ player: null, message: 'No active device' });
    } else {
      const errorData = await response.json();
      return c.json({ error: 'Failed to get player state', details: errorData }, response.status);
    }
  } catch (error) {
    console.error('Player state error:', error);
    return c.json({ error: 'Failed to get player state' }, 500);
  }
});

export default musicRouter;