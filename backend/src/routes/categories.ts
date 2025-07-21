import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import type { Env } from '../index';

const categoriesRouter = new Hono<{ Bindings: Env }>();

// Get all categories
categoriesRouter.get('/', async (c) => {
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return c.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return c.json({ error: 'Failed to get categories' }, 500);
  }
});

// Get category by ID
categoriesRouter.get('/:id', async (c) => {
  const categoryId = c.req.param('id');
  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single();

    if (error) {
      return c.json({ error: 'Category not found' }, 404);
    }

    return c.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    return c.json({ error: 'Failed to get category' }, 500);
  }
});

// Create new category (authenticated users only)
categoriesRouter.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  const { name, description } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!name || name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if category with same name already exists
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existingCategory) {
      return c.json({ error: 'Category with this name already exists' }, 409);
    }

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        is_default: false,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ category }, 201);
  } catch (error) {
    console.error('Create category error:', error);
    return c.json({ error: 'Failed to create category' }, 500);
  }
});

// Update category (only for custom categories)
categoriesRouter.put('/:id', async (c) => {
  const user = c.get('user');
  const categoryId = c.req.param('id');
  const body = await c.req.json();
  const { name, description } = body;

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!name || name.trim() === '') {
    return c.json({ error: 'Category name is required' }, 400);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if category exists and is not a default category
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id, is_default')
      .eq('id', categoryId)
      .single();

    if (checkError || !existingCategory) {
      return c.json({ error: 'Category not found' }, 404);
    }

    if (existingCategory.is_default) {
      return c.json({ error: 'Cannot modify default categories' }, 403);
    }

    // Check if another category with same name already exists
    const { data: duplicateCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('name', name.trim())
      .neq('id', categoryId)
      .single();

    if (duplicateCategory) {
      return c.json({ error: 'Category with this name already exists' }, 409);
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update({
        name: name.trim(),
        description: description?.trim() || null,
      })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return c.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return c.json({ error: 'Failed to update category' }, 500);
  }
});

// Delete category (only for custom categories)
categoriesRouter.delete('/:id', async (c) => {
  const user = c.get('user');
  const categoryId = c.req.param('id');

  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const supabase = createSupabaseClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check if category exists and is not a default category
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('id, is_default')
      .eq('id', categoryId)
      .single();

    if (checkError || !existingCategory) {
      return c.json({ error: 'Category not found' }, 404);
    }

    if (existingCategory.is_default) {
      return c.json({ error: 'Cannot delete default categories' }, 403);
    }

    // Check if category is being used by any user tracks
    const { data: userTracks, error: userTracksError } = await supabase
      .from('user_tracks')
      .select('id')
      .eq('category_id', categoryId)
      .limit(1);

    if (userTracksError) {
      throw userTracksError;
    }

    if (userTracks && userTracks.length > 0) {
      return c.json({ error: 'Cannot delete category that is in use' }, 409);
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      throw error;
    }

    return c.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete category error:', error);
    return c.json({ error: 'Failed to delete category' }, 500);
  }
});

export default categoriesRouter;