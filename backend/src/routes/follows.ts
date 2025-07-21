import { Hono } from 'hono';
import { supabaseClient } from '../lib/supabase';
import type { Env } from '../index';

interface AuthContext {
  user: {
    id: string;
    email: string;
  };
}

const followsRouter = new Hono<{ Bindings: Env; Variables: AuthContext }>();

// Follow a user
followsRouter.post('/:followingId', async (c) => {
  try {
    const user = c.get('user');
    const followingId = c.req.param('followingId');

    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    if (user.id === followingId) {
      return c.json({ error: '自分をフォローすることはできません' }, 400);
    }

    const supabase = supabaseClient(c.env);

    // Check if user exists
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', followingId)
      .single();

    if (userError || !targetUser) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404);
    }

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check follow error:', checkError);
      return c.json({ error: 'フォロー状態の確認に失敗しました' }, 500);
    }

    if (existingFollow) {
      return c.json({ error: '既にフォローしています' }, 409);
    }

    // Create follow relationship
    const { data: follow, error: followError } = await supabase
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

    if (followError) {
      console.error('Follow error:', followError);
      return c.json({ error: 'フォローに失敗しました' }, 500);
    }

    return c.json({ follow, message: 'フォローしました' }, 201);
  } catch (error) {
    console.error('Follow endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Unfollow a user
followsRouter.delete('/:followingId', async (c) => {
  try {
    const user = c.get('user');
    const followingId = c.req.param('followingId');

    if (!user) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const supabase = supabaseClient(c.env);

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) {
      console.error('Unfollow error:', error);
      return c.json({ error: 'アンフォローに失敗しました' }, 500);
    }

    return c.json({ message: 'アンフォローしました' });
  } catch (error) {
    console.error('Unfollow endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Get user's following
followsRouter.get('/following/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const supabase = supabaseClient(c.env);

    const { data: following, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        profiles!follows_following_id_fkey (
          id,
          username,
          display_name,
          bio,
          avatar_url
        )
      `)
      .eq('follower_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get following error:', error);
      return c.json({ error: 'フォロー中ユーザー取得に失敗しました' }, 500);
    }

    return c.json({ following, page, limit });
  } catch (error) {
    console.error('Get following endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Get user's followers
followsRouter.get('/followers/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const supabase = supabaseClient(c.env);

    const { data: followers, error } = await supabase
      .from('follows')
      .select(`
        created_at,
        profiles!follows_follower_id_fkey (
          id,
          username,
          display_name,
          bio,
          avatar_url
        )
      `)
      .eq('following_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get followers error:', error);
      return c.json({ error: 'フォロワー取得に失敗しました' }, 500);
    }

    return c.json({ followers, page, limit });
  } catch (error) {
    console.error('Get followers endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Check if user is following another user
followsRouter.get('/status/:followerId/:followingId', async (c) => {
  try {
    const followerId = c.req.param('followerId');
    const followingId = c.req.param('followingId');

    const supabase = supabaseClient(c.env);

    const { data: follow, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Check follow status error:', error);
      return c.json({ error: 'フォロー状態の確認に失敗しました' }, 500);
    }

    return c.json({ isFollowing: !!follow });
  } catch (error) {
    console.error('Check follow status error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Get follow status for authenticated user
followsRouter.get('/status/:userId', async (c) => {
  try {
    const currentUserId = c.get('user')?.id;
    const targetUserId = c.req.param('userId');

    if (!currentUserId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    if (!targetUserId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 400);
    }

    const supabase = supabaseClient(c.env);

    // Check if current user is following target user
    const { data: followData, error: followError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', targetUserId)
      .single();

    if (followError && followError.code !== 'PGRST116') {
      console.error('Follow status check error:', followError);
      return c.json({ error: 'フォロー状態の確認に失敗しました' }, 500);
    }

    // Get follow counts
    const [followingCountResult, followersCountResult] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
    ]);

    if (followingCountResult.error || followersCountResult.error) {
      console.error('Count error:', followingCountResult.error || followersCountResult.error);
      return c.json({ error: 'フォロー数の取得に失敗しました' }, 500);
    }

    return c.json({
      isFollowing: !!followData,
      followingCount: followingCountResult.count || 0,
      followersCount: followersCountResult.count || 0,
    });
  } catch (error) {
    console.error('Follow status endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// Get follow counts for a user
followsRouter.get('/counts/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const supabase = supabaseClient(c.env);

    // Get followers count
    const { count: followersCount, error: followersError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    if (followersError) {
      console.error('Get followers count error:', followersError);
      return c.json({ error: 'フォロワー数の取得に失敗しました' }, 500);
    }

    // Get following count
    const { count: followingCount, error: followingError } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    if (followingError) {
      console.error('Get following count error:', followingError);
      return c.json({ error: 'フォロー中数の取得に失敗しました' }, 500);
    }

    return c.json({
      followers: followersCount || 0,
      following: followingCount || 0,
    });
  } catch (error) {
    console.error('Get follow counts error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

export default followsRouter;
