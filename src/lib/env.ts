export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
  };
}

export function getSupabaseServiceEnv() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publicEnv = getSupabasePublicEnv();

  return {
    ...publicEnv,
    serviceRoleKey,
    configured: Boolean(publicEnv.url && publicEnv.anonKey && serviceRoleKey),
  };
}
