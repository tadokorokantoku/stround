import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { authMiddleware } from './middleware/auth';
import authRouter from './routes/auth';
import profilesRouter from './routes/profiles';
import postsRouter from './routes/posts';
import musicRouter from './routes/music';
import likesRouter from './routes/likes';
import commentsRouter from './routes/comments';
import categoriesRouter from './routes/categories';
import userTracksRouter from './routes/userTracks';
import followsRouter from './routes/follows';
import timelineRouter from './routes/timeline';
import { notifications } from './routes/notifications';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  API_BASE_URL: string;
  CLIENT_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'], // Expo dev server URLs
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.get('/', (c) => {
  return c.json({ message: 'Stround API is running!' });
});

app.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Public routes (no auth required)
app.route('/auth', authRouter);

// API routes with selective auth middleware
app.route('/api/profiles', profilesRouter);

// Protected routes
app.use('/api/posts/*', authMiddleware);
app.use('/api/music/*', authMiddleware);
app.use('/api/likes/*', authMiddleware);
app.use('/api/comments/*', authMiddleware);
app.use('/api/user-tracks/*', authMiddleware);
app.use('/api/follows/*', authMiddleware);
app.use('/api/timeline/*', authMiddleware);
app.use('/api/notifications/*', authMiddleware);

// Public routes for categories (read-only)
app.route('/api/categories', categoriesRouter);

// API routes
app.route('/api/auth', authRouter);
app.route('/api/posts', postsRouter);
app.route('/api/music', musicRouter);
app.route('/api/likes', likesRouter);
app.route('/api/comments', commentsRouter);
app.route('/api/user-tracks', userTracksRouter);
app.route('/api/follows', followsRouter);
app.route('/api/timeline', timelineRouter);
app.route('/api/notifications', notifications);

export default app;