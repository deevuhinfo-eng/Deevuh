export function validateBackendEnv() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('Missing SUPABASE_URL environment variable.');
  }
  if (!anonKey) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable.');
  }
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
  }

  return { url, anonKey, serviceKey };
}
