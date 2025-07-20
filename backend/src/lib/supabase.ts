import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

export const createSupabaseClient = (supabaseUrl: string, serviceRoleKey: string) => {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};