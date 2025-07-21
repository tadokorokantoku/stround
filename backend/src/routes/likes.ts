import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const likesRouter = new Hono<{ Bindings: Env }>();

likesRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { user_track_id } = body;

  if (!user_track_id) {
    return c.json({ error: 'User track ID is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if user track exists
    const { data: userTrack } = await supabase
      .from('user_tracks')
      .select('id')
      .eq('id', user_track_id)
      .single();

    if (!userTrack) {
      return c.json({ error: 'User track not found' }, 404);
    }

    // Check if like already exists
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('user_track_id', user_track_id)
      .single();

    if (existingLike) {
      return c.json({ error: 'User track already liked' }, 409);
    }

    // Create like
    const { data: like, error } = await supabase
      .from('likes')
      .insert({
        user_id: user.id,
        user_track_id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ like }, 201);
  } catch (error) {
    console.error('Create like error:', error);
    return c.json({ error: 'Failed to like user track' }, 500);
  }
});

likesRouter.delete('/:userTrackId', async (c) => {
  const user = c.get('user');
  const userTrackId = c.req.param('userTrackId');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('user_track_id', userTrackId);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Like removed successfully' });
  } catch (error) {
    console.error('Delete like error:', error);
    return c.json({ error: 'Failed to unlike user track' }, 500);
  }
});

likesRouter.get('/user-track/:userTrackId', async (c) => {
  const userTrackId = c.req.param('userTrackId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: likes, error } = await supabase
      .from('likes')
      .select(`
        *,
        profiles!likes_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_track_id', userTrackId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ likes, page, limit });
  } catch (error) {
    console.error('Get likes error:', error);
    return c.json({ error: 'Failed to get likes' }, 500);
  }
});

export default likesRouter;