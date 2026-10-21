import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

// Service-role client pinned to the `plan` schema. This app never touches any other schema.
let client: SupabaseClient<Database, 'plan'> | null = null;

export function db(): SupabaseClient<Database, 'plan'> {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set');
    client = createClient<Database, 'plan'>(url, key, {
      db: { schema: 'plan' },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
