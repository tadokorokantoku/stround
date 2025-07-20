import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const postsRouter = new Hono<{ Bindings: Env }>();

postsRouter.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        music (
          id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ posts, page, limit });
  } catch (error) {
    console.error('Get posts error:', error);
    return c.json({ error: 'Failed to get posts' }, 500);
  }
});

postsRouter.get('/:id', async (c) => {
  const postId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        music (
          id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url
        )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      return c.json({ error: 'Post not found' }, 404);
    }

    return c.json({ post });
  } catch (error) {
    console.error('Get post error:', error);
    return c.json({ error: 'Failed to get post' }, 500);
  }
});

postsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { content, music_id } = body;

  if (!content || content.trim() === '') {
    return c.json({ error: 'Content is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        music_id: music_id || null,
      })
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        music (
          id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    return c.json({ post }, 201);
  } catch (error) {
    console.error('Create post error:', error);
    return c.json({ error: 'Failed to create post' }, 500);
  }
});

postsRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const postId = c.req.param('id');
  const body = await c.req.json();
  const { content } = body;

  if (!content || content.trim() === '') {
    return c.json({ error: 'Content is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: post, error } = await supabase
      .from('posts')
      .update({
        content: content.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', postId)
      .eq('user_id', user.id)
      .select(`
        *,
        profiles!posts_user_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        ),
        music (
          id,
          title,
          artist,
          album,
          image_url,
          preview_url,
          external_url
        )
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Post not found or not authorized' }, 404);
      }
      throw error;
    }

    return c.json({ post });
  } catch (error) {
    console.error('Update post error:', error);
    return c.json({ error: 'Failed to update post' }, 500);
  }
});

postsRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const postId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    return c.json({ error: 'Failed to delete post' }, 500);
  }
});

export default postsRouter;