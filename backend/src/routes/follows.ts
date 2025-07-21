import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const followsRouter = new Hono<{ Bindings: Env }>();

// Get user's followers
followsRouter.get('/followers/:userId', async (c) => {
  const userId = c.req.param('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: followers, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        profiles!follows_follower_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ followers, page, limit });
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Failed to get followers' }, 500);
  }
});

// Get user's following
followsRouter.get('/following/:userId', async (c) => {
  const userId = c.req.param('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: following, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        profiles!follows_following_id_fkey (
          id,
          username,
          display_name,
          avatar_url
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return c.json({ following, page, limit });
  } catch (error) {
    console.error('Get following error:', error);
    return c.json({ error: 'Failed to get following' }, 500);
  }
});

// Check if user is following another user
followsRouter.get('/status/:followerId/:followingId', async (c) => {
  const followerId = c.req.param('followerId');
  const followingId = c.req.param('followingId');

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: follow, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return c.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Check follow status error:', error);
    return c.json({ error: 'Failed to check follow status' }, 500);
  }
});

// Follow a user
followsRouter.post('/:followingId', async (c) => {
  const user = c.get('user');
  const followingId = c.req.param('followingId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (user.id === followingId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', followingId)
      .single();

    if (userError || !targetUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (existingFollow) {
      return c.json({ error: 'Already following this user' }, 409);
    }

    // Create follow relationship
    const { data: follow, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId,
      })
      .select(`
        *,
        profiles!follows_following_id_fkey (
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

    return c.json({ follow }, 201);
  } catch (error) {
    console.error('Follow user error:', error);
    return c.json({ error: 'Failed to follow user' }, 500);
  }
});

// Unfollow a user
followsRouter.delete('/:followingId', async (c) => {
  const user = c.get('user');
  const followingId = c.req.param('followingId');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    return c.json({ error: 'Failed to unfollow user' }, 500);
  }
});

// Get follow counts for a user
followsRouter.get('/counts/:userId', async (c) => {
  const userId = c.req.param('userId');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get followers count
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (followersError) {
      throw followersError;
    }

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (followingError) {
      throw followingError;
    }

    return c.json({
      followers: followersCount || 0,
      following: followingCount || 0,
    });
  } catch (error) {
    console.error('Get follow counts error:', error);
    return c.json({ error: 'Failed to get follow counts' }, 500);
  }
});

export default followsRouter;