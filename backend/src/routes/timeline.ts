import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const timelineRouter = new Hono<{ Bindings: Env }>();

// Get user's timeline (posts from followed users + own posts)
timelineRouter.get('/', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get list of users that the current user follows (including themselves for their own posts)
    const { data: followedUsers, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (followError) {
      throw followError;
    }

    // Create array of user IDs including the current user
    const userIds = [user.id, ...(followedUsers?.map(f => f.following_id) || [])];

    // Get user tracks from followed users and self
    const { data: timelinePosts, error: postsError } = await supabase
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
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      throw postsError;
    }

    // Get like counts and user's like status for each post
    const timelineWithLikes = await Promise.all(
      (timelinePosts || []).map(async (post) => {
        // Get like count for this user track
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        // Check if current user has liked this post
        const { data: userLike } = await supabase
          .from('likes')
          .select('id')
          .eq('user_track_id', post.id)
          .eq('user_id', user.id)
          .single();

        // Get comment count for this user track
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          is_liked_by_user: !!userLike,
          comments_count: commentsCount || 0,
        };
      })
    );

    return c.json({ 
      timeline: timelineWithLikes, 
      page, 
      limit,
      hasMore: timelineWithLikes.length === limit
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    return c.json({ error: 'Failed to get timeline' }, 500);
  }
});

// Get public timeline (all user tracks, useful for discovery)
timelineRouter.get('/public', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const currentUser = c.get('user'); // Optional for public timeline

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: timelinePosts, error: postsError } = await supabase
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

    if (postsError) {
      throw postsError;
    }

    // Get like counts and user's like status for each post (if user is logged in)
    const timelineWithLikes = await Promise.all(
      (timelinePosts || []).map(async (post) => {
        // Get like count for this user track
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        // Check if current user has liked this post (if logged in)
        let userLike = null;
        if (currentUser) {
          const { data } = await supabase
            .from('likes')
            .select('id')
            .eq('user_track_id', post.id)
            .eq('user_id', currentUser.id)
            .single();
          userLike = data;
        }

        // Get comment count for this user track
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          is_liked_by_user: !!userLike,
          comments_count: commentsCount || 0,
        };
      })
    );

    return c.json({ 
      timeline: timelineWithLikes, 
      page, 
      limit,
      hasMore: timelineWithLikes.length === limit
    });
  } catch (error) {
    console.error('Get public timeline error:', error);
    return c.json({ error: 'Failed to get public timeline' }, 500);
  }
});

// Get user's own posts timeline
timelineRouter.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;
  const currentUser = c.get('user');

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: timelinePosts, error: postsError } = await supabase
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
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      throw postsError;
    }

    // Get like counts and user's like status for each post
    const timelineWithLikes = await Promise.all(
      (timelinePosts || []).map(async (post) => {
        // Get like count for this user track
        const { count: likesCount } = await supabase
          .from('likes')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        // Check if current user has liked this post (if logged in)
        let userLike = null;
        if (currentUser) {
          const { data } = await supabase
            .from('likes')
            .select('id')
            .eq('user_track_id', post.id)
            .eq('user_id', currentUser.id)
            .single();
          userLike = data;
        }

        // Get comment count for this user track
        const { count: commentsCount } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('user_track_id', post.id);

        return {
          ...post,
          likes_count: likesCount || 0,
          is_liked_by_user: !!userLike,
          comments_count: commentsCount || 0,
        };
      })
    );

    return c.json({ 
      timeline: timelineWithLikes, 
      page, 
      limit,
      hasMore: timelineWithLikes.length === limit
    });
  } catch (error) {
    console.error('Get user timeline error:', error);
    return c.json({ error: 'Failed to get user timeline' }, 500);
  }
});

export default timelineRouter;