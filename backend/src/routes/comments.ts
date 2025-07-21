import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const commentsRouter = new Hono<{ Bindings: Env }>();

commentsRouter.get('/user-track/:userTrackId', async (c) => {
  const userTrackId = c.req.param('userTrackId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('user_track_id', userTrackId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ comments, page, limit });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Failed to get comments' }, 500);
  }
});

commentsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { user_track_id, content } = body;

  if (!user_track_id || !content || content.trim() === '') {
    return c.json({ error: 'User track ID and content are required' }, 400);
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

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        user_track_id,
        content: content.trim(),
      })
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return c.json({ comment }, 201);
  } catch (error) {
    console.error('Create comment error:', error);
    return c.json({ error: 'Failed to create comment' }, 500);
  }
});

commentsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const commentId = c.req.param('id');
  const body = await c.req.json();
  const { content } = body;

  if (!content || content.trim() === '') {
    return c.json({ error: 'Content is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: comment, error } = await supabase
      .from('comments')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Comment not found or not authorized' }, 404);
      }
      throw error;
    }

    return c.json({ comment });
  } catch (error) {
    console.error('Update comment error:', error);
    return c.json({ error: 'Failed to update comment' }, 500);
  }
});

commentsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const commentId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    return c.json({ error: 'Failed to delete comment' }, 500);
  }
});

export default commentsRouter;