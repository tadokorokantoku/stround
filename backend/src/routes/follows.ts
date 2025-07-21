import { Hono } from 'hono';
import { supabaseClient } from '../lib/supabase';
import type { Env } from '../index';

interface AuthContext {
  user: {
    id: string;
    email: string;
  };
}

const app = new Hono<{ Bindings: Env; Variables: AuthContext }>();

app.post('/follow/:userId', async (c) => {
  try {
    const currentUserId = c.get('user').id;
    const userToFollowId = c.req.param('userId');

    if (!userToFollowId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 400);
    }

    if (currentUserId === userToFollowId) {
      return c.json({ error: '自分をフォローすることはできません' }, 400);
    }

    const supabase = supabaseClient(c.env);

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUserId)
      .eq('following_id', userToFollowId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Check follow error:', checkError);
      return c.json({ error: 'フォロー状態の確認に失敗しました' }, 500);
    }

    if (existingFollow) {
      return c.json({ error: '既にフォローしています' }, 400);
    }

    // Create follow relationship
    const { error: followError } = await supabase
      .from('follows')
      .insert({
        follower_id: currentUserId,
        following_id: userToFollowId,
      });

    if (followError) {
      console.error('Follow error:', followError);
      return c.json({ error: 'フォローに失敗しました' }, 500);
    }

    return c.json({ message: 'フォローしました' });
  } catch (error) {
    console.error('Follow endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

app.delete('/unfollow/:userId', async (c) => {
  try {
    const currentUserId = c.get('user').id;
    const userToUnfollowId = c.req.param('userId');

    if (!userToUnfollowId) {
      return c.json({ error: 'ユーザーIDが必要です' }, 400);
    }

    const supabase = supabaseClient(c.env);

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', currentUserId)
      .eq('following_id', userToUnfollowId);

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

app.get('/following/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const supabase = supabaseClient(c.env);

    const { data: follows, error } = await supabase
      .from('follows')
      .select(`
        following_id,
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

    const followingUsers = follows.map(follow => ({
      ...follow.profiles,
      followed_at: follow.created_at,
    }));

    return c.json({
      users: followingUsers,
      page,
      limit,
      hasMore: follows.length === limit,
    });
  } catch (error) {
    console.error('Get following endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

app.get('/followers/:userId', async (c) => {
  try {
    const userId = c.req.param('userId');
    const page = Number(c.req.query('page')) || 1;
    const limit = Number(c.req.query('limit')) || 20;
    const offset = (page - 1) * limit;

    const supabase = supabaseClient(c.env);

    const { data: follows, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
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

    const followers = follows.map(follow => ({
      ...follow.profiles,
      followed_at: follow.created_at,
    }));

    return c.json({
      users: followers,
      page,
      limit,
      hasMore: follows.length === limit,
    });
  } catch (error) {
    console.error('Get followers endpoint error:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

app.get('/status/:userId', async (c) => {
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

export default app;