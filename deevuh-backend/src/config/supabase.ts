import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { validateBackendEnv } from './env';

dotenv.config();

const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceKey: supabaseServiceRoleKey } = validateBackendEnv();

if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL loaded:', supabaseUrl);
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  console.log('Supabase project reference:', match ? match[1] : 'Unknown');
  console.log('Whether anon key exists:', !!supabaseAnonKey);
}

// 1. Standard client (anon privileges)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. Administrative client (service role overrides for metadata sync / triggers)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export default supabase;
