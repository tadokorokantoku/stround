import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { SpotifyAPI } from '../lib/spotify';
import type { Env } from '../index';

const userTracksRouter = new Hono<{ Bindings: Env }>();

// Get user tracks with optional filtering
userTracksRouter.get('/', async (c) => {
  const userId = c.req.query('user_id');
  const categoryId = c.req.query('category_id');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    let query = supabase
      .from('user_tracks')
      .select(`
        *,
        profiles!user_tracks_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories!user_tracks_category_id_fkey (
          id,
          name,
          description
        ),
        music!user_tracks_spotify_track_id_fkey (
          id,
          spotify_id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url,
          duration_ms
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data: userTracks, error } = await query;

    if (error) {
      throw error;
    }

    return c.json({ userTracks, page, limit });
  } catch (error) {
    console.error('Get user tracks error:', error);
    return c.json({ error: 'Failed to get user tracks' }, 500);
  }
});

// Get user track by ID
userTracksRouter.get('/:id', async (c) => {
  const userTrackId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: userTrack, error } = await supabase
      .from('user_tracks')
      .select(`
        *,
        profiles!user_tracks_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories!user_tracks_category_id_fkey (
          id,
          name,
          description
        ),
        music!user_tracks_spotify_track_id_fkey (
          id,
          spotify_id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url,
          duration_ms
        )
      `)
      .eq('id', userTrackId)
      .single();

    if (error) {
      return c.json({ error: 'User track not found' }, 404);
    }

    return c.json({ userTrack });
  } catch (error) {
    console.error('Get user track error:', error);
    return c.json({ error: 'Failed to get user track' }, 500);
  }
});

// Add a track to user's library (create user track)
userTracksRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { category_id, spotify_track_id, comment } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!category_id || !spotify_track_id) {
    return c.json({ error: 'Category ID and Spotify track ID are required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Verify category exists
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', category_id)
      .single();

    if (categoryError || !category) {
      return c.json({ error: 'Category not found' }, 404);
    }

    // Check if user already has this track in this category
    const { data: existingUserTrack } = await supabase
      .from('user_tracks')
      .select('id')
      .eq('user_id', user.id)
      .eq('category_id', category_id)
      .eq('spotify_track_id', spotify_track_id)
      .single();

    if (existingUserTrack) {
      return c.json({ error: 'Track already exists in this category' }, 409);
    }

    // Get or create music entry from Spotify
    let musicEntry = null;
    const { data: existingMusic } = await supabase
      .from('music')
      .select('*')
      .eq('spotify_id', spotify_track_id)
      .single();

    if (existingMusic) {
      musicEntry = existingMusic;
    } else {
      // Fetch from Spotify and cache
      const spotify = new SpotifyAPI(c.env.SPOTIFY_CLIENT_ID, c.env.SPOTIFY_CLIENT_SECRET);
      const track = await spotify.getTrack(spotify_track_id);

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

      const { data: newMusic, error: musicError } = await supabase
        .from('music')
        .insert(trackData)
        .select()
        .single();

      if (musicError) {
        console.error('Music cache error:', musicError);
        // Continue with track data even if caching fails
        musicEntry = trackData;
      } else {
        musicEntry = newMusic;
      }
    }

    // Create user track entry
    const { data: userTrack, error } = await supabase
      .from('user_tracks')
      .insert({
        user_id: user.id,
        category_id,
        spotify_track_id,
        comment: comment?.trim() || null,
      })
      .select(`
        *,
        profiles!user_tracks_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories!user_tracks_category_id_fkey (
          id,
          name,
          description
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    // Manually add music data to response since FK relationship might not work
    const responseUserTrack = {
      ...userTrack,
      music: musicEntry
    };

    return c.json({ userTrack: responseUserTrack }, 201);
  } catch (error) {
    console.error('Create user track error:', error);
    return c.json({ error: 'Failed to add track to library' }, 500);
  }
});

// Update user track comment
userTracksRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const userTrackId = c.req.param('id');
  const body = await c.req.json();
  const { comment } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: userTrack, error } = await supabase
      .from('user_tracks')
      .update({
        comment: comment?.trim() || null,
      })
      .eq('id', userTrackId)
      .eq('user_id', user.id)
      .select(`
        *,
        profiles!user_tracks_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories!user_tracks_category_id_fkey (
          id,
          name,
          description
        ),
        music!user_tracks_spotify_track_id_fkey (
          id,
          spotify_id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url,
          duration_ms
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'User track not found or not authorized' }, 404);
      }
      throw error;
    }

    return c.json({ userTrack });
  } catch (error) {
    console.error('Update user track error:', error);
    return c.json({ error: 'Failed to update user track' }, 500);
  }
});

// Delete user track
userTracksRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const userTrackId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('user_tracks')
      .delete()
      .eq('id', userTrackId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Track removed from library successfully' });
  } catch (error) {
    console.error('Delete user track error:', error);
    return c.json({ error: 'Failed to remove track from library' }, 500);
  }
});

// Get user's tracks by category (for profile view)
userTracksRouter.get('/user/:userId/category/:categoryId', async (c) => {
  const userId = c.req.param('userId');
  const categoryId = c.req.param('categoryId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: userTracks, error } = await supabase
      .from('user_tracks')
      .select(`
        *,
        profiles!user_tracks_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        categories!user_tracks_category_id_fkey (
          id,
          name,
          description
        ),
        music!user_tracks_spotify_track_id_fkey (
          id,
          spotify_id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url,
          duration_ms
        )
      `)
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ userTracks, page, limit });
  } catch (error) {
    console.error('Get user tracks by category error:', error);
    return c.json({ error: 'Failed to get user tracks' }, 500);
  }
});

// Get user's track categories with counts
userTracksRouter.get('/user/:userId/categories', async (c) => {
  const userId = c.req.param('userId');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all categories with track counts for this user
    const { data: categoriesWithCounts, error } = await supabase
      .from('categories')
      .select(`
        *,
        user_tracks!user_tracks_category_id_fkey (
          id
        )
      `);

    if (error) {
      throw error;
    }

    // Transform the data to include track counts
    const categories = categoriesWithCounts?.map(category => ({
      ...category,
      track_count: category.user_tracks?.filter((track: any) => track.user_id === userId)?.length || 0,
      user_tracks: undefined // Remove the user_tracks array from response
    })) || [];

    // Filter out categories with 0 tracks, unless they are default categories
    const filteredCategories = categories.filter(cat => 
      cat.is_default || cat.track_count > 0
    );

    return c.json({ categories: filteredCategories });
  } catch (error) {
    console.error('Get user categories error:', error);
    return c.json({ error: 'Failed to get user categories' }, 500);
  }
});

export default userTracksRouter;