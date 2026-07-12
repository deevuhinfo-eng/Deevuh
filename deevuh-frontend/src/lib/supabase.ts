import { createClient } from '@supabase/supabase-js';
import { validateFrontendEnv } from './env';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = validateFrontendEnv();

if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL loaded:', supabaseUrl);
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  console.log('Supabase project reference:', match ? match[1] : 'Unknown');
  console.log('Whether anon key exists:', !!supabaseAnonKey);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
