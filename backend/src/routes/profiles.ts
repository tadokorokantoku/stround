import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../index';

const profilesRouter = new Hono<{ Bindings: Env }>();

// プロフィール取得（自分）
profilesRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        followers:follows!follows_following_id_fkey(count),
        following:follows!follows_follower_id_fkey(count)
      `)
      .eq('id', user.id)
      .single();

    if (error) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// プロフィール取得（他ユーザー）
profilesRouter.get('/:userId', async (c) => {
  const userId = c.req.param('userId');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        *,
        followers:follows!follows_following_id_fkey(count),
        following:follows!follows_follower_id_fkey(count)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    return c.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return c.json({ error: 'Failed to fetch profile' }, 500);
  }
});

// プロフィール更新
profilesRouter.put('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const { display_name, bio, username, profile_image_url } = await c.req.json();
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // usernameが変更される場合は重複チェック
    if (username) {
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        return c.json({ error: 'Username already exists' }, 400);
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (display_name !== undefined) updateData.display_name = display_name;
    if (bio !== undefined) updateData.bio = bio;
    if (username !== undefined) updateData.username = username;
    if (profile_image_url !== undefined) updateData.profile_image_url = profile_image_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ profile: data });
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

// ユーザー検索
profilesRouter.get('/search/:query', async (c) => {
  const query = c.req.param('query');
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;
  
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, bio, profile_image_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .range(offset, offset + limit - 1);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ profiles });
  } catch (error) {
    console.error('Search profiles error:', error);
    return c.json({ error: 'Failed to search profiles' }, 500);
  }
});

// フォロー機能
profilesRouter.post('/:userId/follow', authMiddleware, async (c) => {
  const user = c.get('user');
  const followingId = c.req.param('userId');
  
  if (user.id === followingId) {
    return c.json({ error: 'Cannot follow yourself' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // 既にフォローしているかチェック
    const { data: existing } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', user.id)
      .eq('following_id', followingId)
      .single();

    if (existing) {
      return c.json({ error: 'Already following this user' }, 400);
    }

    const { error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: followingId,
      });

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('Follow error:', error);
    return c.json({ error: 'Failed to follow user' }, 500);
  }
});

// アンフォロー機能
profilesRouter.delete('/:userId/follow', authMiddleware, async (c) => {
  const user = c.get('user');
  const followingId = c.req.param('userId');
  
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow error:', error);
    return c.json({ error: 'Failed to unfollow user' }, 500);
  }
});

// フォロワー一覧
profilesRouter.get('/:userId/followers', async (c) => {
  const userId = c.req.param('userId');
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;
  
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data: followers, error } = await supabase
      .from('follows')
      .select(`
        follower_id,
        profiles!follows_follower_id_fkey(id, username, display_name, profile_image_url)
      `)
      .eq('following_id', userId)
      .range(offset, offset + limit - 1);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    return c.json({ error: 'Failed to fetch followers' }, 500);
  }
});

// フォロー中一覧
profilesRouter.get('/:userId/following', async (c) => {
  const userId = c.req.param('userId');
  const limit = Number(c.req.query('limit')) || 20;
  const offset = Number(c.req.query('offset')) || 0;
  
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data: following, error } = await supabase
      .from('follows')
      .select(`
        following_id,
        profiles!follows_following_id_fkey(id, username, display_name, profile_image_url)
      `)
      .eq('follower_id', userId)
      .range(offset, offset + limit - 1);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    return c.json({ error: 'Failed to fetch following' }, 500);
  }
});

export default profilesRouter;