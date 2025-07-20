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
    const tracks = await spotify.searchTracks(query, limit);

    const formattedTracks = tracks.map(track => ({
      spotify_id: track.id,
      title: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      image_url: track.album.images[0]?.url || null,
      preview_url: track.preview_url,
      external_url: track.external_urls.spotify,
    }));

    return c.json({ tracks: formattedTracks });
  } catch (error) {
    console.error('Music search error:', error);
    return c.json({ error: 'Failed to search music' }, 500);
  }
});

musicRouter.get('/:id', async (c) => {
  const musicId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: music, error } = await supabase
      .from('music')
      .select('*')
      .eq('id', musicId)
      .single();

    if (error) {
      return c.json({ error: 'Music not found' }, 404);
    }

    return c.json({ music });
  } catch (error) {
    console.error('Get music error:', error);
    return c.json({ error: 'Failed to get music' }, 500);
  }
});

musicRouter.post('/', async (c) => {
  const body = await c.req.json();
  const { spotify_id, title, artist, album, image_url, preview_url, external_url } = body;

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

export default musicRouter;