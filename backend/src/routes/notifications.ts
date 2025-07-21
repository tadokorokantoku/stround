import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';

export const notifications = new Hono();

notifications.use('*', authMiddleware);

// 通知作成
notifications.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, type, related_id, message } = body;
    
    if (!user_id || !type) {
      return c.json({ error: 'ユーザーIDとタイプは必須です' }, 400);
    }

    // 通知作成者と受信者が同じ場合は通知しない
    const currentUserId = c.get('user')?.id;
    if (currentUserId === user_id) {
      return c.json({ message: '自分への通知は作成されません' }, 200);
    }

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        related_id,
        message,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      console.error('通知作成エラー:', error);
      return c.json({ error: '通知の作成に失敗しました' }, 500);
    }

    return c.json(data, 201);
  } catch (error) {
    console.error('通知作成処理エラー:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 通知一覧取得
notifications.get('/', async (c) => {
  try {
    const userId = c.get('user')?.id;
    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        related_user:profiles!notifications_related_id_fkey(
          id,
          username,
          display_name,
          profile_image_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('通知取得エラー:', error);
      return c.json({ error: '通知の取得に失敗しました' }, 500);
    }

    return c.json(data || []);
  } catch (error) {
    console.error('通知一覧取得処理エラー:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 通知既読
notifications.put('/:id/read', async (c) => {
  try {
    const notificationId = c.req.param('id');
    const userId = c.get('user')?.id;

    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('通知既読エラー:', error);
      return c.json({ error: '通知の既読処理に失敗しました' }, 500);
    }

    if (!data) {
      return c.json({ error: '通知が見つかりません' }, 404);
    }

    return c.json(data);
  } catch (error) {
    console.error('通知既読処理エラー:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 全通知既読
notifications.put('/read-all', async (c) => {
  try {
    const userId = c.get('user')?.id;

    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('全通知既読エラー:', error);
      return c.json({ error: '通知の既読処理に失敗しました' }, 500);
    }

    return c.json({ message: '全ての通知を既読にしました' });
  } catch (error) {
    console.error('全通知既読処理エラー:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 未読通知数取得
notifications.get('/unread-count', async (c) => {
  try {
    const userId = c.get('user')?.id;

    if (!userId) {
      return c.json({ error: '認証が必要です' }, 401);
    }

    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('未読通知数取得エラー:', error);
      return c.json({ error: '未読通知数の取得に失敗しました' }, 500);
    }

    return c.json({ count: count || 0 });
  } catch (error) {
    console.error('未読通知数取得処理エラー:', error);
    return c.json({ error: 'サーバーエラーが発生しました' }, 500);
  }
});

// 通知ヘルパー関数
export const createNotification = async (
  userId: string,
  type: string,
  relatedId?: string,
  message?: string
) => {
  try {
    const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        related_id: relatedId,
        message,
        is_read: false
      });

    if (error) {
      console.error('通知作成エラー:', error);
    }
  } catch (error) {
    console.error('通知作成処理エラー:', error);
  }
};