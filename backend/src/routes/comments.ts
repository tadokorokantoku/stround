import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

interface CommentWithProfile {
  id: string;
  user_track_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: CommentWithProfile[];
}

interface CommentTree extends CommentWithProfile {
  replies: CommentTree[];
}

const commentsRouter = new Hono<{ Bindings: Env }>();

// Function to build comment tree from flat comments
function buildCommentTree(comments: CommentWithProfile[]): CommentTree[] {
  const commentMap = new Map<string, CommentTree>();
  const rootComments: CommentTree[] = [];

  // Create map of all comments
  comments.forEach(comment => {
    commentMap.set(comment.id, {
      ...comment,
      replies: []
    });
  });

  // Build tree structure
  comments.forEach(comment => {
    const commentNode = commentMap.get(comment.id)!;
    
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(commentNode);
      } else {
        // Parent not found, treat as root comment
        rootComments.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
}

// Get comments for a user track with nested replies
commentsRouter.get('/user-track/:userTrackId', async (c) => {
  const userTrackId = c.req.param('userTrackId');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const offset = (page - 1) * limit;

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Get all comments for the user track (including replies)
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
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Build comment tree
    const commentTree = buildCommentTree(comments as CommentWithProfile[]);

    // Apply pagination to root comments only
    const paginatedRootComments = commentTree.slice(offset, offset + limit);

    return c.json({ 
      comments: paginatedRootComments, 
      page, 
      limit,
      total: commentTree.length 
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return c.json({ error: 'Failed to get comments' }, 500);
  }
});

// Create a new comment or reply
commentsRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { user_track_id, content, parent_comment_id } = body;

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

    // If this is a reply, check if parent comment exists and belongs to the same user track
    if (parent_comment_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id, user_track_id')
        .eq('id', parent_comment_id)
        .single();

      if (!parentComment) {
        return c.json({ error: 'Parent comment not found' }, 404);
      }

      if (parentComment.user_track_id !== user_track_id) {
        return c.json({ error: 'Parent comment does not belong to the same user track' }, 400);
      }
    }

    const { data: comment, error } = await supabase
      .from('comments')
      .insert({
        user_id: user.id,
        user_track_id,
        content: content.trim(),
        parent_comment_id: parent_comment_id || null,
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

// Update a comment (only by the author)
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

// Delete a comment (only by the author) - this will also delete all replies due to CASCADE
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

// Get a specific comment with its replies
commentsRouter.get('/:id', async (c) => {
  const commentId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: comment, error } = await supabase
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
      .eq('id', commentId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return c.json({ error: 'Comment not found' }, 404);
      }
      throw error;
    }

    return c.json({ comment });
  } catch (error) {
    console.error('Get comment error:', error);
    return c.json({ error: 'Failed to get comment' }, 500);
  }
});

export default commentsRouter;