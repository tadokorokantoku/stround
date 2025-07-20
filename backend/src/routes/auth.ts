import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { authMiddleware } from '../middleware/auth';
import type { Env } from '../index';

const authRouter = new Hono<{ Bindings: Env }>();

// ユーザー登録
authRouter.post('/register', async (c) => {
  const { email, password, username, display_name } = await c.req.json();

  if (!email || !password || !username) {
    return c.json({ error: 'Email, password, and username are required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return c.json({ error: authError.message }, 400);
    }

    // プロフィール作成
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        username,
        display_name: display_name || username,
      });

    if (profileError) {
      // ユーザー作成をロールバック
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: 'Failed to create profile' }, 500);
    }

    return c.json({
      message: 'User registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        username,
        display_name: display_name || username,
      },
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }
});

// ログイン
authRouter.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    // プロフィール情報を取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      return c.json({ error: 'Failed to fetch profile' }, 500);
    }

    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: {
        id: data.user.id,
        email: data.user.email,
        ...profile,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// トークンリフレッシュ
authRouter.post('/refresh', async (c) => {
  const { refresh_token } = await c.req.json();

  if (!refresh_token) {
    return c.json({ error: 'Refresh token is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  try {
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json({ error: 'Token refresh failed' }, 500);
  }
});

// ログアウト
authRouter.post('/logout', authMiddleware, async (c) => {
  const user = c.get('user');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { error } = await supabase.auth.admin.signOut(user.id);

    if (error) {
      return c.json({ error: error.message }, 400);
    }

    return c.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

// 認証状態確認
authRouter.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      return c.json({ error: 'Failed to fetch profile' }, 500);
    }

    return c.json({
      user: {
        id: user.id,
        email: user.email,
        ...profile,
      },
    });
  } catch (error) {
    console.error('User info error:', error);
    return c.json({ error: 'Failed to fetch user info' }, 500);
  }
});

export default authRouter;